-- Initial MVP schema. Covers: tenancy, content, assets, redirects, publishing,
-- landing-page forms, and tracking configs. river creates its own tables on init.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Reusable trigger: updated_at = now() on every UPDATE
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- Tenancy
-- ---------------------------------------------------------------------------
CREATE TABLE tenants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            TEXT NOT NULL UNIQUE,
    name            TEXT NOT NULL,
    primary_domain  TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER tenants_set_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT NOT NULL,
    name          TEXT,
    last_login_at TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_idx ON users (lower(email));
CREATE TRIGGER users_set_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TYPE user_role AS ENUM ('brand_admin', 'editor');

CREATE TABLE memberships (
    tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role       user_role NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, user_id)
);
CREATE INDEX memberships_user_id_idx ON memberships(user_id);

-- Magic-link login tokens. token_hash is sha256 of the raw token sent by email.
CREATE TABLE magic_link_tokens (
    token_hash   BYTEA PRIMARY KEY,
    email        TEXT NOT NULL,
    redirect_url TEXT,
    expires_at   TIMESTAMPTZ NOT NULL,
    consumed_at  TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX magic_link_tokens_expires_at_idx ON magic_link_tokens(expires_at);

-- Cookie-based sessions. id is sent in the cookie; lookup is direct.
CREATE TABLE sessions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at   TIMESTAMPTZ NOT NULL,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_agent   TEXT,
    ip_address   INET,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_id_idx ON sessions(user_id);
CREATE INDEX sessions_expires_at_idx ON sessions(expires_at);

-- ---------------------------------------------------------------------------
-- Content
-- ---------------------------------------------------------------------------
CREATE TYPE content_status AS ENUM ('draft', 'published', 'archived');

CREATE TABLE content_entries (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type          TEXT NOT NULL,
    slug          TEXT,
    status        content_status NOT NULL DEFAULT 'draft',
    title         TEXT NOT NULL,
    body          JSONB NOT NULL DEFAULT '{}'::jsonb,
    seo           JSONB NOT NULL DEFAULT '{}'::jsonb,
    published_at  TIMESTAMPTZ,
    created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by    UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX content_entries_tenant_type_slug_idx
    ON content_entries (tenant_id, type, slug)
    WHERE slug IS NOT NULL;
CREATE INDEX content_entries_tenant_status_idx
    ON content_entries (tenant_id, status);
CREATE TRIGGER content_entries_set_updated_at
    BEFORE UPDATE ON content_entries
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Assets (brand-approved media library)
-- ---------------------------------------------------------------------------
CREATE TABLE assets (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    storage_key  TEXT NOT NULL,
    filename     TEXT NOT NULL,
    content_type TEXT NOT NULL,
    byte_size    BIGINT NOT NULL,
    width        INTEGER,
    height       INTEGER,
    alt_text     TEXT,
    tags         TEXT[] NOT NULL DEFAULT '{}',
    approved     BOOLEAN NOT NULL DEFAULT false,
    uploaded_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX assets_tenant_id_idx ON assets(tenant_id);
CREATE INDEX assets_tags_idx ON assets USING gin(tags);

-- ---------------------------------------------------------------------------
-- Redirects (preserves SEO when slugs change)
-- ---------------------------------------------------------------------------
CREATE TYPE redirect_kind AS ENUM ('permanent', 'temporary');

CREATE TABLE redirects (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    from_path  TEXT NOT NULL,
    to_path    TEXT NOT NULL,
    kind       redirect_kind NOT NULL DEFAULT 'permanent',
    source     TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX redirects_tenant_from_idx ON redirects(tenant_id, from_path);

-- ---------------------------------------------------------------------------
-- Publish snapshots (frozen content tree per publish)
-- ---------------------------------------------------------------------------
CREATE TYPE publish_status AS ENUM ('pending', 'building', 'live', 'failed', 'rolled_back');

CREATE TABLE publish_snapshots (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    content       JSONB NOT NULL,
    status        publish_status NOT NULL DEFAULT 'pending',
    triggered_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    build_log     TEXT,
    artifact_key  TEXT,
    started_at    TIMESTAMPTZ,
    finished_at   TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX publish_snapshots_tenant_created_idx
    ON publish_snapshots(tenant_id, created_at DESC);
CREATE INDEX publish_snapshots_status_idx
    ON publish_snapshots(status)
    WHERE status IN ('pending', 'building');

-- ---------------------------------------------------------------------------
-- Landing-page form submissions
-- ---------------------------------------------------------------------------
CREATE TABLE form_submissions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    landing_page_id UUID REFERENCES content_entries(id) ON DELETE SET NULL,
    form_id         TEXT NOT NULL,
    payload         JSONB NOT NULL,
    utm             JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX form_submissions_tenant_created_idx
    ON form_submissions(tenant_id, created_at DESC);
CREATE INDEX form_submissions_landing_idx
    ON form_submissions(landing_page_id);

-- ---------------------------------------------------------------------------
-- Tracking configs (per-tenant SEM / ads pixels)
-- ---------------------------------------------------------------------------
CREATE TABLE tracking_configs (
    tenant_id                    UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    ga4_measurement_id           TEXT,
    gtm_container_id             TEXT,
    meta_pixel_id                TEXT,
    google_ads_conversion_label  TEXT,
    linkedin_partner_id          TEXT,
    tiktok_pixel_id              TEXT,
    clarity_project_id           TEXT,
    hotjar_site_id               TEXT,
    updated_at                   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER tracking_configs_set_updated_at
    BEFORE UPDATE ON tracking_configs
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
