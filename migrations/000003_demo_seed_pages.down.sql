DELETE FROM content_entries
WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'demo')
  AND slug IN ('home', 'campaign-q3');
