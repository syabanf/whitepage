-- Rename content_entries → web_pages (the "Web Page" level in the hierarchy:
-- Tenant → Project → Web Page → Article → Comment) and enforce project_id NOT NULL.
--
-- FK columns that reference this table — articles.web_page_id and
-- form_submissions.landing_page_id — are tracked by table OID, so they stay
-- valid across the rename automatically. We also rename the table's indexes,
-- primary key, and updated_at trigger to keep names consistent.
--
-- NOTE: assets, redirects, form_submissions, and tracking_configs intentionally
-- remain tenant-scoped. Moving any of them to project scope is a per-table
-- product decision (per-project pixels / per-site redirects vs. shared brand
-- assets), not part of this mechanical rename.

-- 1. Backfill any row still missing a project_id (prefer the tenant's 'main'
--    project, else its oldest), then enforce NOT NULL.
UPDATE content_entries ce
SET project_id = (
    SELECT p.id FROM projects p
    WHERE p.tenant_id = ce.tenant_id
    ORDER BY (p.slug = 'main') DESC, p.created_at
    LIMIT 1
)
WHERE ce.project_id IS NULL;

ALTER TABLE content_entries ALTER COLUMN project_id SET NOT NULL;

-- 2. Rename the table.
ALTER TABLE content_entries RENAME TO web_pages;

-- 3. Rename indexes + primary key + trigger for naming consistency.
ALTER INDEX content_entries_pkey                 RENAME TO web_pages_pkey;
ALTER INDEX content_entries_project_idx          RENAME TO web_pages_project_idx;
ALTER INDEX content_entries_tenant_status_idx    RENAME TO web_pages_tenant_status_idx;
ALTER INDEX content_entries_tenant_type_slug_idx RENAME TO web_pages_tenant_type_slug_idx;
ALTER TRIGGER content_entries_set_updated_at ON web_pages RENAME TO web_pages_set_updated_at;
