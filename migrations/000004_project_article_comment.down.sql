DROP TABLE IF EXISTS comments;
DROP TYPE  IF EXISTS comment_status;
DROP TABLE IF EXISTS articles;

DROP INDEX IF EXISTS content_entries_project_idx;
ALTER TABLE content_entries DROP COLUMN IF EXISTS project_id;

DROP TABLE IF EXISTS projects;
