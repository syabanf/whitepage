package server

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/syabanf/company-profile-cms/apps/api/internal/handlers"
)

func (s *Server) routes() {
	health := handlers.NewHealth(s.pool, s.logger)
	auth := handlers.NewAuth(s.pool, s.logger)
	content := handlers.NewContent(s.pool, s.logger)
	publishes := handlers.NewPublishes(s.pool, s.logger, s.queue)
	assetsH := handlers.NewAssets(s.pool, s.logger, s.store, s.cfg.AssetPublicBase)
	projects := handlers.NewProjects(s.pool, s.logger, s.cfg.PlatformDomain)
	articles := handlers.NewArticles(s.pool, s.logger)
	comments := handlers.NewComments(s.pool, s.logger)
	admin := handlers.NewAdmin(s.pool, s.logger)
	domains := handlers.NewDomains(s.pool, s.logger, s.cfg.PlatformDomain, s.cfg.DomainAutoVerify)

	s.router.Get("/healthz", health.Live)
	s.router.Get("/readyz", health.Ready)

	s.router.Post("/auth/magic-link", auth.RequestMagicLink)
	s.router.Post("/auth/verify", auth.Verify)
	s.router.Post("/auth/password", auth.Password)
	s.router.Post("/auth/logout", auth.Logout)

	// Public static file serving for uploaded assets (CDN-like; no auth).
	fileServer := http.StripPrefix("/files/", http.FileServer(http.Dir(s.cfg.UploadDir)))
	s.router.Handle("/files/*", withImageCache(fileServer))

	// Public comment submission (no auth; honeypot-guarded; lands as pending).
	s.router.Post("/public/articles/{articleId}/comments", comments.Submit)

	// Internal routes — static service-token auth (renderer preview/snapshot).
	s.router.Group(func(r chi.Router) {
		r.Use(handlers.RequireServiceToken(s.cfg.InternalToken, s.logger))
		r.Get("/internal/entries/{entryId}", content.PreviewByID)
		r.Get("/internal/articles/{articleId}", articles.PreviewByID)
		r.Get("/internal/resolve", domains.Resolve)
	})

	// Session-required routes
	s.router.Group(func(r chi.Router) {
		r.Use(handlers.RequireSession(s.pool, s.logger))
		r.Get("/me", auth.Me)

		// Platform (SaaS) admin console — super-admins only
		r.Group(func(r chi.Router) {
			r.Use(handlers.RequirePlatformAdmin(s.pool, s.logger))
			r.Get("/admin/stats", admin.Stats)
			r.Get("/admin/tenants", admin.Tenants)
			r.Get("/admin/users", admin.Users)
			r.Get("/admin/projects", admin.Projects)
			r.Patch("/admin/users/{userId}", admin.SetUserPlatformAdmin)
		})

		// Tenant-scoped routes — require membership in {tenantId}
		r.Route("/tenants/{tenantId}", func(r chi.Router) {
			r.Use(handlers.RequireMembership(s.pool, s.logger))

			r.Get("/entries", content.List)
			r.Post("/entries", content.Create)
			r.Get("/entries/{entryId}", content.Get)
			r.Patch("/entries/{entryId}", content.Update)
			r.Delete("/entries/{entryId}", content.Delete)

			r.Get("/publishes", publishes.List)
			r.Post("/publishes", publishes.Create)
			r.Get("/publishes/{publishId}", publishes.Get)

			r.Get("/assets", assetsH.List)
			r.Post("/assets", assetsH.Upload)

			// Projects (a tenant has many)
			r.Get("/projects", projects.List)
			r.Post("/projects", projects.Create)
			r.Get("/projects/{projectId}", projects.Get)

			// Domains per project (subdomain + custom)
			r.Get("/projects/{projectId}/domains", domains.List)
			r.Post("/projects/{projectId}/domains", domains.Add)
			r.Post("/projects/{projectId}/domains/{domainId}/verify", domains.Verify)
			r.Post("/projects/{projectId}/domains/{domainId}/primary", domains.SetPrimary)
			r.Delete("/projects/{projectId}/domains/{domainId}", domains.Delete)

			// Articles live under a web page (content_entries)
			r.Get("/entries/{entryId}/articles", articles.ListForWebPage)
			r.Post("/entries/{entryId}/articles", articles.Create)
			r.Get("/articles/{articleId}", articles.Get)
			r.Patch("/articles/{articleId}", articles.Update)
			r.Delete("/articles/{articleId}", articles.Delete)

			// Comment moderation
			r.Get("/comments", comments.List)
			r.Patch("/comments/{commentId}", comments.Moderate)
		})
	})
}

// withImageCache sets long-lived cache headers + permissive CORS so the
// renderer (different origin in dev) can load images.
func withImageCache(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "public, max-age=3600")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		next.ServeHTTP(w, r)
	})
}
