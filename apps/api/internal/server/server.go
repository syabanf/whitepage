package server

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/syabanf/company-profile-cms/apps/api/internal/assets"
	"github.com/syabanf/company-profile-cms/apps/api/internal/config"
	"github.com/syabanf/company-profile-cms/apps/api/internal/jobs"
)

type Server struct {
	cfg    config.Config
	logger *slog.Logger
	pool   *pgxpool.Pool
	queue  *jobs.Runtime
	store  *assets.Store
	router *chi.Mux
}

func New(cfg config.Config, logger *slog.Logger, pool *pgxpool.Pool, queue *jobs.Runtime) *Server {
	store, err := assets.NewStore(cfg.UploadDir)
	if err != nil {
		logger.Error("init asset store", "err", err, "dir", cfg.UploadDir)
	}
	s := &Server{
		cfg:    cfg,
		logger: logger,
		pool:   pool,
		queue:  queue,
		store:  store,
		router: chi.NewRouter(),
	}
	s.useMiddleware()
	s.routes()
	return s
}

func (s *Server) Handler() http.Handler {
	return s.router
}

func (s *Server) useMiddleware() {
	s.router.Use(middleware.RequestID)
	s.router.Use(middleware.RealIP)
	s.router.Use(middleware.Recoverer)
	s.router.Use(middleware.Timeout(60 * time.Second))
	s.router.Use(s.logRequests)
}

func (s *Server) logRequests(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)
		defer func() {
			s.logger.Info("request",
				"method", r.Method,
				"path", r.URL.Path,
				"status", ww.Status(),
				"bytes", ww.BytesWritten(),
				"duration_ms", time.Since(start).Milliseconds(),
				"request_id", middleware.GetReqID(r.Context()),
			)
		}()
		next.ServeHTTP(ww, r)
	})
}
