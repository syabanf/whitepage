package handlers

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ctxKey string

const (
	ctxUserID    ctxKey = "user_id"
	ctxTenantID  ctxKey = "tenant_id"
	ctxUserRole  ctxKey = "user_role"
	ctxTenantSlug ctxKey = "tenant_slug"
)

// RequireSession resolves the session cookie or bearer token into a userID and
// attaches it to the request context. Returns 401 if no valid session.
func RequireSession(pool *pgxpool.Pool, logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			sessionID := readSessionID(r)
			if sessionID == "" {
				WriteJSON(w, http.StatusUnauthorized, errBody("unauthorized", "no session"))
				return
			}
			var userID uuid.UUID
			var expiresAt time.Time
			err := pool.QueryRow(r.Context(),
				`SELECT user_id, expires_at FROM sessions WHERE id = $1`, sessionID,
			).Scan(&userID, &expiresAt)
			if err != nil {
				if errors.Is(err, pgx.ErrNoRows) {
					WriteJSON(w, http.StatusUnauthorized, errBody("unauthorized", "invalid session"))
					return
				}
				logger.Error("session lookup", "err", err)
				WriteJSON(w, http.StatusInternalServerError, errBody("internal", "session lookup failed"))
				return
			}
			if time.Now().After(expiresAt) {
				WriteJSON(w, http.StatusUnauthorized, errBody("expired", "session expired"))
				return
			}
			ctx := context.WithValue(r.Context(), ctxUserID, userID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RequireMembership ensures the authenticated user belongs to the tenant in
// the URL. Must be mounted under a route with {tenantId} URL param. Attaches
// tenant_id, tenant_slug, and user_role to the context.
func RequireMembership(pool *pgxpool.Pool, logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID, ok := UserIDFromContext(r.Context())
			if !ok {
				WriteJSON(w, http.StatusUnauthorized, errBody("unauthorized", "no user"))
				return
			}
			tenantIDStr := chi.URLParam(r, "tenantId")
			tenantID, err := uuid.Parse(tenantIDStr)
			if err != nil {
				WriteJSON(w, http.StatusBadRequest, errBody("bad_request", "invalid tenantId"))
				return
			}

			var slug, role string
			err = pool.QueryRow(r.Context(), `
				SELECT t.slug, m.role::text
				FROM memberships m
				JOIN tenants t ON t.id = m.tenant_id
				WHERE m.user_id = $1 AND m.tenant_id = $2
			`, userID, tenantID).Scan(&slug, &role)
			if err != nil {
				if errors.Is(err, pgx.ErrNoRows) {
					WriteJSON(w, http.StatusForbidden, errBody("forbidden", "not a member of this tenant"))
					return
				}
				logger.Error("membership lookup", "err", err)
				WriteJSON(w, http.StatusInternalServerError, errBody("internal", "membership lookup failed"))
				return
			}

			ctx := r.Context()
			ctx = context.WithValue(ctx, ctxTenantID, tenantID)
			ctx = context.WithValue(ctx, ctxTenantSlug, slug)
			ctx = context.WithValue(ctx, ctxUserRole, role)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RequirePlatformAdmin gates the SaaS platform console to super-admins.
// Must run after RequireSession.
func RequirePlatformAdmin(pool *pgxpool.Pool, logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID, ok := UserIDFromContext(r.Context())
			if !ok {
				WriteJSON(w, http.StatusUnauthorized, errBody("unauthorized", "no user"))
				return
			}
			var isAdmin bool
			if err := pool.QueryRow(r.Context(),
				`SELECT is_platform_admin FROM users WHERE id = $1`, userID,
			).Scan(&isAdmin); err != nil {
				logger.Error("platform admin check", "err", err)
				WriteJSON(w, http.StatusInternalServerError, errBody("internal", "admin check failed"))
				return
			}
			if !isAdmin {
				WriteJSON(w, http.StatusForbidden, errBody("forbidden", "platform admin only"))
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// RequireServiceToken guards internal endpoints with a static bearer token
// (used by the renderer's preview/snapshot fetches).
func RequireServiceToken(token string, logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			hdr := r.Header.Get("Authorization")
			const prefix = "Bearer "
			if token == "" || len(hdr) <= len(prefix) || hdr[len(prefix):] != token {
				WriteJSON(w, http.StatusUnauthorized, errBody("unauthorized", "invalid service token"))
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func UserIDFromContext(ctx context.Context) (uuid.UUID, bool) {
	v, ok := ctx.Value(ctxUserID).(uuid.UUID)
	return v, ok
}

func TenantIDFromContext(ctx context.Context) (uuid.UUID, bool) {
	v, ok := ctx.Value(ctxTenantID).(uuid.UUID)
	return v, ok
}

func TenantSlugFromContext(ctx context.Context) (string, bool) {
	v, ok := ctx.Value(ctxTenantSlug).(string)
	return v, ok
}

func UserRoleFromContext(ctx context.Context) (string, bool) {
	v, ok := ctx.Value(ctxUserRole).(string)
	return v, ok
}
