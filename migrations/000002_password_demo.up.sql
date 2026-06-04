-- Adds password authentication and seeds a demo workspace + user.
-- Password hashes use bcrypt via pgcrypto (already enabled in 000001).

ALTER TABLE users ADD COLUMN password_hash TEXT;

-- Seed demo tenant
INSERT INTO tenants (slug, name)
SELECT 'demo', 'Demo Workspace'
WHERE NOT EXISTS (SELECT 1 FROM tenants WHERE slug = 'demo');

-- Seed demo user with bcrypt-hashed password
INSERT INTO users (email, name, password_hash)
SELECT 'demo@cms.app', 'Demo User', crypt('cms-demo-2026', gen_salt('bf', 10))
WHERE NOT EXISTS (SELECT 1 FROM users WHERE lower(email) = 'demo@cms.app');

-- Wire the demo user into the demo workspace as brand_admin
INSERT INTO memberships (tenant_id, user_id, role)
SELECT
  (SELECT id FROM tenants WHERE slug = 'demo'),
  (SELECT id FROM users   WHERE lower(email) = 'demo@cms.app'),
  'brand_admin'
WHERE NOT EXISTS (
  SELECT 1
  FROM memberships m
  JOIN tenants t ON t.id = m.tenant_id
  JOIN users   u ON u.id = m.user_id
  WHERE t.slug = 'demo' AND lower(u.email) = 'demo@cms.app'
);
