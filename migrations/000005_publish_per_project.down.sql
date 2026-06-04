DROP INDEX IF EXISTS publish_snapshots_project_idx;
ALTER TABLE publish_snapshots DROP COLUMN IF EXISTS project_id;
