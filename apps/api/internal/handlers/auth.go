package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/syabanf/company-profile-cms/apps/api/internal/auth"
)

type Auth struct {
	pool   *pgxpool.Pool
	logger *slog.Logger
}

func NewAuth(pool *pgxpool.Pool, logger *slog.Logger) *Auth {
	return &Auth{pool: pool, logger: logger}
}

type magicLinkRequest struct {
	Email       string `json:"email"`
	RedirectUrl string `json:"redirectUrl"`
}

func (a *Auth) RequestMagicLink(w http.ResponseWriter, r *http.Request) {
	var req magicLinkRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteJSON(w, http.StatusBadRequest, errBody("bad_request", "invalid JSON"))
		return
	}
	email := strings.TrimSpace(strings.ToLower(req.Email))
	if email == "" || !strings.Contains(email, "@") {
		WriteJSON(w, http.StatusBadRequest, errBody("validation_failed", "valid email required"))
		return
	}

	raw, hash, err := auth.GenerateToken()
	if err != nil {
		a.logger.Error("token generate", "err", err)
		WriteJSON(w, http.StatusInternalServerError, errBody("internal", "could not generate token"))
		return
	}

	expiresAt := time.Now().Add(15 * time.Minute)
	if _, err := a.pool.Exec(r.Context(), `
		INSERT INTO magic_link_tokens (token_hash, email, redirect_url, expires_at)
		VALUES ($1, $2, $3, $4)
	`, hash, email, nullableString(req.RedirectUrl), expiresAt); err != nil {
		a.logger.Error("magic link insert", "err", err)
		WriteJSON(w, http.StatusInternalServerError, errBody("internal", "could not store token"))
		return
	}

	redirect := strings.TrimSpace(req.RedirectUrl)
	if redirect == "" {
		redirect = "http://localhost:3010/auth/verify"
	}
	magicLink := fmt.Sprintf("%s?token=%s", redirect, raw)
	a.logger.Info("magic link issued (dev)", "email", email, "link", magicLink)
	fmt.Printf("\n============== MAGIC LINK (dev only) ==============\n  Email:  %s\n  Link:   %s\n  Expires:%s\n===================================================\n\n",
		email, magicLink, expiresAt.Format(time.RFC3339))

	w.WriteHeader(http.StatusAccepted)
}

type verifyRequest struct {
	Token string `json:"token"`
}

func (a *Auth) Verify(w http.ResponseWriter, r *http.Request) {
	var req verifyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteJSON(w, http.StatusBadRequest, errBody("bad_request", "invalid JSON"))
		return
	}
	if req.Token == "" {
		WriteJSON(w, http.StatusBadRequest, errBody("validation_failed", "token required"))
		return
	}

	hash := auth.HashToken(req.Token)

	var email string
	var expiresAt time.Time
	var consumedAt *time.Time
	err := a.pool.QueryRow(r.Context(), `
		SELECT email, expires_at, consumed_at
		FROM magic_link_tokens
		WHERE token_hash = $1
	`, hash).Scan(&email, &expiresAt, &consumedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			WriteJSON(w, http.StatusUnauthorized, errBody("invalid_token", "link is invalid"))
			return
		}
		a.logger.Error("verify lookup", "err", err)
		WriteJSON(w, http.StatusInternalServerError, errBody("internal", "could not verify"))
		return
	}
	if consumedAt != nil {
		WriteJSON(w, http.StatusUnauthorized, errBody("consumed", "link already used"))
		return
	}
	if time.Now().After(expiresAt) {
		WriteJSON(w, http.StatusUnauthorized, errBody("expired", "link expired"))
		return
	}

	if _, err := a.pool.Exec(r.Context(),
		`UPDATE magic_link_tokens SET consumed_at = now() WHERE token_hash = $1`, hash); err != nil {
		a.logger.Warn("mark consumed", "err", err)
	}

	var userID uuid.UUID
	var name *string
	err = a.pool.QueryRow(r.Context(), `
		WITH upsert AS (
			INSERT INTO users (email)
			SELECT $1
			WHERE NOT EXISTS (SELECT 1 FROM users WHERE lower(email) = lower($1))
			RETURNING id, name
		)
		SELECT id, name FROM upsert
		UNION ALL
		SELECT id, name FROM users WHERE lower(email) = lower($1)
		LIMIT 1
	`, email).Scan(&userID, &name)
	if err != nil {
		a.logger.Error("user upsert", "err", err)
		WriteJSON(w, http.StatusInternalServerError, errBody("internal", "could not create user"))
		return
	}

	_, _ = a.pool.Exec(r.Context(),
		`UPDATE users SET last_login_at = now() WHERE id = $1`, userID)

	var sessionID uuid.UUID
	err = a.pool.QueryRow(r.Context(), `
		INSERT INTO sessions (user_id, expires_at, user_agent)
		VALUES ($1, now() + INTERVAL '30 days', $2)
		RETURNING id
	`, userID, r.UserAgent()).Scan(&sessionID)
	if err != nil {
		a.logger.Error("session insert", "err", err)
		WriteJSON(w, http.StatusInternalServerError, errBody("internal", "could not create session"))
		return
	}

	WriteJSON(w, http.StatusOK, map[string]any{
		"sessionId": sessionID,
		"user": map[string]any{
			"id":    userID,
			"email": email,
			"name":  name,
		},
	})
}

type passwordRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (a *Auth) Password(w http.ResponseWriter, r *http.Request) {
	var req passwordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteJSON(w, http.StatusBadRequest, errBody("bad_request", "invalid JSON"))
		return
	}
	email := strings.TrimSpace(strings.ToLower(req.Email))
	if email == "" || req.Password == "" {
		WriteJSON(w, http.StatusBadRequest, errBody("validation_failed", "email and password required"))
		return
	}

	var userID uuid.UUID
	var name *string
	var ok bool
	err := a.pool.QueryRow(r.Context(), `
		SELECT id, name,
		       password_hash IS NOT NULL AND password_hash = crypt($2, password_hash)
		FROM users
		WHERE lower(email) = $1
	`, email, req.Password).Scan(&userID, &name, &ok)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			// Same response shape as wrong password — prevents user enumeration.
			WriteJSON(w, http.StatusUnauthorized, errBody("invalid_credentials", "email or password is incorrect"))
			return
		}
		a.logger.Error("password lookup", "err", err)
		WriteJSON(w, http.StatusInternalServerError, errBody("internal", "could not verify"))
		return
	}
	if !ok {
		WriteJSON(w, http.StatusUnauthorized, errBody("invalid_credentials", "email or password is incorrect"))
		return
	}

	_, _ = a.pool.Exec(r.Context(),
		`UPDATE users SET last_login_at = now() WHERE id = $1`, userID)

	var sessionID uuid.UUID
	err = a.pool.QueryRow(r.Context(), `
		INSERT INTO sessions (user_id, expires_at, user_agent)
		VALUES ($1, now() + INTERVAL '30 days', $2)
		RETURNING id
	`, userID, r.UserAgent()).Scan(&sessionID)
	if err != nil {
		a.logger.Error("session insert", "err", err)
		WriteJSON(w, http.StatusInternalServerError, errBody("internal", "could not create session"))
		return
	}

	WriteJSON(w, http.StatusOK, map[string]any{
		"sessionId": sessionID,
		"user": map[string]any{
			"id":    userID,
			"email": email,
			"name":  name,
		},
	})
}

func (a *Auth) Me(w http.ResponseWriter, r *http.Request) {
	sessionID := readSessionID(r)
	if sessionID == "" {
		WriteJSON(w, http.StatusUnauthorized, errBody("unauthorized", "no session"))
		return
	}

	var userID uuid.UUID
	var email string
	var name *string
	var isPlatformAdmin bool
	var expiresAt time.Time
	err := a.pool.QueryRow(r.Context(), `
		SELECT u.id, u.email, u.name, u.is_platform_admin, s.expires_at
		FROM sessions s
		JOIN users u ON u.id = s.user_id
		WHERE s.id = $1
	`, sessionID).Scan(&userID, &email, &name, &isPlatformAdmin, &expiresAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			WriteJSON(w, http.StatusUnauthorized, errBody("unauthorized", "session not found"))
			return
		}
		a.logger.Error("me lookup", "err", err)
		WriteJSON(w, http.StatusInternalServerError, errBody("internal", "could not load user"))
		return
	}
	if time.Now().After(expiresAt) {
		WriteJSON(w, http.StatusUnauthorized, errBody("expired", "session expired"))
		return
	}

	_, _ = a.pool.Exec(r.Context(),
		`UPDATE sessions SET last_seen_at = now() WHERE id = $1`, sessionID)

	memberships := make([]map[string]any, 0)
	rows, err := a.pool.Query(r.Context(), `
		SELECT m.tenant_id, t.name, t.slug, m.role::text
		FROM memberships m
		JOIN tenants t ON t.id = m.tenant_id
		WHERE m.user_id = $1
		ORDER BY t.name
	`, userID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var tenantID uuid.UUID
			var tName, tSlug, role string
			if err := rows.Scan(&tenantID, &tName, &tSlug, &role); err == nil {
				memberships = append(memberships, map[string]any{
					"tenantId":   tenantID,
					"tenantName": tName,
					"tenantSlug": tSlug,
					"role":       role,
				})
			}
		}
	}

	WriteJSON(w, http.StatusOK, map[string]any{
		"user": map[string]any{
			"id":              userID,
			"email":           email,
			"name":            name,
			"isPlatformAdmin": isPlatformAdmin,
		},
		"memberships": memberships,
	})
}

func (a *Auth) Logout(w http.ResponseWriter, r *http.Request) {
	sessionID := readSessionID(r)
	if sessionID != "" {
		_, _ = a.pool.Exec(r.Context(), `DELETE FROM sessions WHERE id = $1`, sessionID)
	}
	w.WriteHeader(http.StatusNoContent)
}

func readSessionID(r *http.Request) string {
	if c, err := r.Cookie("cms_session"); err == nil && c.Value != "" {
		return c.Value
	}
	hdr := r.Header.Get("Authorization")
	if strings.HasPrefix(hdr, "Bearer ") {
		return strings.TrimPrefix(hdr, "Bearer ")
	}
	return ""
}

func nullableString(s string) any {
	if strings.TrimSpace(s) == "" {
		return nil
	}
	return s
}

func errBody(code, msg string) map[string]string {
	return map[string]string{"code": code, "message": msg}
}
