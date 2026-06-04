package handlers

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Health struct {
	pool   *pgxpool.Pool
	logger *slog.Logger
}

func NewHealth(pool *pgxpool.Pool, logger *slog.Logger) *Health {
	return &Health{pool: pool, logger: logger}
}

func (h *Health) Live(w http.ResponseWriter, r *http.Request) {
	WriteJSON(w, http.StatusOK, map[string]string{"status": "alive"})
}

func (h *Health) Ready(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()

	if err := h.pool.Ping(ctx); err != nil {
		h.logger.Warn("readiness ping failed", "err", err)
		WriteJSON(w, http.StatusServiceUnavailable, map[string]string{
			"status": "not_ready",
			"error":  "database unavailable",
		})
		return
	}

	WriteJSON(w, http.StatusOK, map[string]string{"status": "ready"})
}
