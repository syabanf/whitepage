-- Platform (SaaS) super-admin flag — distinct from per-tenant membership roles.
ALTER TABLE users ADD COLUMN is_platform_admin BOOLEAN NOT NULL DEFAULT false;

-- Seed: the demo user can reach the platform console.
UPDATE users SET is_platform_admin = true WHERE lower(email) = 'demo@cms.app';
