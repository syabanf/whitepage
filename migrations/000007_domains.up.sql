-- Per-project domains: one auto subdomain + optional verified custom domains.
-- The renderer routes incoming requests to a project by matching the Host header.

CREATE TYPE domain_type AS ENUM ('subdomain', 'custom');
CREATE TYPE domain_status AS ENUM ('pending', 'verified', 'active', 'error');

CREATE TABLE domains (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id         UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    hostname           TEXT NOT NULL,
    type               domain_type NOT NULL,
    status             domain_status NOT NULL DEFAULT 'pending',
    verification_token TEXT,
    is_primary         BOOLEAN NOT NULL DEFAULT false,
    verified_at        TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX domains_hostname_idx ON domains (lower(hostname));
CREATE INDEX domains_project_idx ON domains (project_id);

-- Backfill: every existing project gets its platform subdomain, already active.
INSERT INTO domains (project_id, hostname, type, status, is_primary)
SELECT p.id, t.slug || '-' || p.slug || '.cms.app', 'subdomain', 'active', true
FROM projects p
JOIN tenants t ON t.id = p.tenant_id;
