-- Publishing becomes project-scoped: each project = its own site snapshot.

ALTER TABLE publish_snapshots ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

-- Backfill existing snapshots to their tenant's main project.
UPDATE publish_snapshots ps
SET project_id = (SELECT id FROM projects WHERE tenant_id = ps.tenant_id AND slug = 'main' LIMIT 1);

CREATE INDEX publish_snapshots_project_idx ON publish_snapshots (project_id, created_at DESC);

-- Cosmetic: the default project was named after the tenant on creation; give it
-- a clearer name so the project header isn't redundant with the workspace name.
UPDATE projects SET name = 'Main site' WHERE slug = 'main';
