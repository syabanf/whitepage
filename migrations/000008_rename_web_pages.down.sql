-- Reverse 000008: web_pages → content_entries, and drop the project_id NOT NULL.
-- Rename the trigger while the table is still named web_pages, then the indexes,
-- then the table, then relax the constraint.
ALTER TRIGGER web_pages_set_updated_at ON web_pages RENAME TO content_entries_set_updated_at;
ALTER INDEX web_pages_tenant_type_slug_idx RENAME TO content_entries_tenant_type_slug_idx;
ALTER INDEX web_pages_tenant_status_idx    RENAME TO content_entries_tenant_status_idx;
ALTER INDEX web_pages_project_idx          RENAME TO content_entries_project_idx;
ALTER INDEX web_pages_pkey                 RENAME TO content_entries_pkey;
ALTER TABLE web_pages RENAME TO content_entries;
ALTER TABLE content_entries ALTER COLUMN project_id DROP NOT NULL;
