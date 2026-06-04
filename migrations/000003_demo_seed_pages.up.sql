-- Seeds the Demo Workspace with a published home page so a freshly-signed-in
-- demo user has something to edit right away.

INSERT INTO content_entries (tenant_id, type, slug, status, title, body, seo, published_at, created_by, updated_by)
SELECT
  (SELECT id FROM tenants WHERE slug = 'demo'),
  'page',
  'home',
  'published',
  'Acme — Industrial precision since 1947',
  $${
    "sections": [
      {
        "id": "hero",
        "templateKey": "hero_centered",
        "slots": {
          "eyebrow": "Industrial precision since 1947",
          "headline": "Hardware the world runs on.",
          "subhead": "Load-bearing components engineered for the next century. Trusted by 14 of the Fortune 100.",
          "primaryCta": {"label": "Talk to engineering", "href": "/contact"},
          "secondaryCta": {"label": "See case studies", "href": "/case-studies"}
        },
        "variants": {"background": "white", "align": "center"}
      },
      {
        "id": "faq",
        "templateKey": "faq_accordion",
        "slots": {
          "eyebrow": "FAQ",
          "headline": "Common questions",
          "items": [
            {"question": "What materials do you specialize in?", "answer": "Titanium, stainless 316, and proprietary cobalt-chrome alloys for high-cycle fatigue applications."},
            {"question": "Do you ship internationally?", "answer": "We deliver to 38 countries with DDP terms; sub-3-day lead times to North America and Western Europe."},
            {"question": "What is your minimum order?", "answer": "We work with engineering teams from prototype (10 units) through full production runs (50,000+)."}
          ]
        },
        "variants": {"background": "gray"}
      }
    ]
  }$$::jsonb,
  $${
    "title": "Acme — Industrial precision since 1947",
    "description": "Acme builds the load-bearing hardware that runs the world. Trusted by 14 of the Fortune 100."
  }$$::jsonb,
  now(),
  (SELECT id FROM users WHERE lower(email) = 'demo@cms.app'),
  (SELECT id FROM users WHERE lower(email) = 'demo@cms.app')
WHERE NOT EXISTS (
  SELECT 1 FROM content_entries
  WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'demo')
    AND type = 'page'
    AND slug = 'home'
);

-- Also seed a landing page so the demo has both types.
INSERT INTO content_entries (tenant_id, type, slug, status, title, body, seo, published_at, created_by, updated_by)
SELECT
  (SELECT id FROM tenants WHERE slug = 'demo'),
  'landing_page',
  'campaign-q3',
  'published',
  'Cut your fatigue failures by 60%',
  $${
    "sections": [
      {
        "id": "lead",
        "templateKey": "lead_form_hero",
        "slots": {
          "eyebrow": "Free analysis",
          "headline": "Cut your fatigue failures by 60%.",
          "subhead": "We will run a free FEA pass on your top 3 components. 20-minute conversation, no obligation.",
          "benefits": ["No purchase required", "NDA-protected", "Senior engineer leads every call"],
          "formId": "lead_q3_2026",
          "fields": [
            {"name": "name", "label": "Full name", "type": "text", "required": true},
            {"name": "email", "label": "Work email", "type": "email", "required": true},
            {"name": "company", "label": "Company", "type": "text", "required": true}
          ],
          "submitLabel": "Request my analysis",
          "thankYouRedirect": "/thank-you"
        },
        "variants": {"background": "brand", "layout": "left-form-right"}
      }
    ]
  }$$::jsonb,
  $${
    "title": "Cut your fatigue failures by 60% | Acme Industrial",
    "description": "Free fatigue analysis for your top 3 components. 20-minute conversation, no obligation."
  }$$::jsonb,
  now(),
  (SELECT id FROM users WHERE lower(email) = 'demo@cms.app'),
  (SELECT id FROM users WHERE lower(email) = 'demo@cms.app')
WHERE NOT EXISTS (
  SELECT 1 FROM content_entries
  WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'demo')
    AND type = 'landing_page'
    AND slug = 'campaign-q3'
);
