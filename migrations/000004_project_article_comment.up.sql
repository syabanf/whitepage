-- Establishes the new content hierarchy WITHOUT breaking the running app:
--   Tenant → Project (new) → Web Page (= content_entries) → Article (new) → Comment (new)
--
-- Additive + backfilled. Existing tenant-scoped code keeps working; the
-- content_entries → web_pages rename and full project repointing of
-- assets/redirects/publishes/forms/tracking happen in a later coordinated
-- refactor alongside the Go/editor/renderer changes.

-- ---------------------------------------------------------------------------
-- Project — a single website under a tenant. A tenant can have many projects.
-- ---------------------------------------------------------------------------
CREATE TABLE projects (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    slug           TEXT NOT NULL,
    name           TEXT NOT NULL,
    primary_domain TEXT,
    created_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX projects_tenant_slug_idx ON projects (tenant_id, slug);
CREATE INDEX projects_tenant_idx ON projects (tenant_id);
CREATE TRIGGER projects_set_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Backfill: every existing tenant gets one default project so current content
-- has a home in the new hierarchy.
INSERT INTO projects (tenant_id, slug, name)
SELECT id, 'main', name
FROM tenants;

-- ---------------------------------------------------------------------------
-- Web Page = content_entries. Add project_id (nullable for now so existing
-- INSERTs that don't yet set it keep working), backfilled to the tenant's
-- default project.
-- ---------------------------------------------------------------------------
ALTER TABLE content_entries ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

UPDATE content_entries ce
SET project_id = p.id
FROM projects p
WHERE p.tenant_id = ce.tenant_id AND p.slug = 'main';

CREATE INDEX content_entries_project_idx ON content_entries (project_id);

-- ---------------------------------------------------------------------------
-- Article — a content document that belongs to a Web Page (its listing page),
-- e.g. a /blog page has many articles. Composed of sections like web pages.
-- ---------------------------------------------------------------------------
CREATE TABLE articles (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id     UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    web_page_id    UUID NOT NULL REFERENCES content_entries(id) ON DELETE CASCADE,
    slug           TEXT,
    title          TEXT NOT NULL,
    status         content_status NOT NULL DEFAULT 'draft',
    excerpt        TEXT,
    body           JSONB NOT NULL DEFAULT '{"sections":[]}'::jsonb,
    seo            JSONB NOT NULL DEFAULT '{}'::jsonb,
    cover_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
    author_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    published_at   TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Article URL is /{web-page-slug}/{article-slug}; slug unique within its page.
CREATE UNIQUE INDEX articles_page_slug_idx ON articles (web_page_id, slug) WHERE slug IS NOT NULL;
CREATE INDEX articles_project_idx ON articles (project_id);
CREATE INDEX articles_page_status_idx ON articles (web_page_id, status);
CREATE TRIGGER articles_set_updated_at
    BEFORE UPDATE ON articles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Comment — public visitor comment on an Article, with moderation.
-- parent_id supports threaded replies.
-- ---------------------------------------------------------------------------
CREATE TYPE comment_status AS ENUM ('pending', 'approved', 'spam', 'deleted');

CREATE TABLE comments (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id   UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_id    UUID REFERENCES comments(id) ON DELETE CASCADE,
    author_name  TEXT NOT NULL,
    author_email TEXT,
    body         TEXT NOT NULL,
    status       comment_status NOT NULL DEFAULT 'pending',
    ip_address   INET,
    user_agent   TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX comments_article_idx ON comments (article_id, status, created_at DESC);
CREATE INDEX comments_project_status_idx ON comments (project_id, status);
CREATE INDEX comments_moderation_idx ON comments (project_id, status) WHERE status = 'pending';
