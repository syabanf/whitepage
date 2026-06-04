DELETE FROM memberships
USING tenants t, users u
WHERE memberships.tenant_id = t.id
  AND memberships.user_id   = u.id
  AND t.slug = 'demo'
  AND lower(u.email) = 'demo@cms.app';

DELETE FROM users   WHERE lower(email) = 'demo@cms.app';
DELETE FROM tenants WHERE slug = 'demo';

ALTER TABLE users DROP COLUMN IF EXISTS password_hash;
