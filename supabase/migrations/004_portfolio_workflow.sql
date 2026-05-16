-- AaaG — Portfolio Website Workflow
-- Run this after the base template/app migrations in Supabase.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 001_init.sql created a smaller templates table. Keep this migration runnable
-- even if 003 was skipped or partially failed before these columns existed.
ALTER TABLE templates ADD COLUMN IF NOT EXISTS emoji TEXT DEFAULT '';
ALTER TABLE templates ADD COLUMN IF NOT EXISTS creator_id TEXT;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS creator_name TEXT;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS revenue_share_pct SMALLINT DEFAULT 0 CHECK (revenue_share_pct BETWEEN 0 AND 70);
ALTER TABLE templates ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT TRUE;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS requires_media BOOLEAN DEFAULT FALSE;

-- Apps need to support config-driven platform rendering.
ALTER TABLE apps ADD COLUMN IF NOT EXISTS template_slug TEXT NOT NULL DEFAULT 'recipe-app';
ALTER TABLE apps ADD COLUMN IF NOT EXISTS config JSONB NOT NULL DEFAULT '{}';
ALTER TABLE apps ADD COLUMN IF NOT EXISTS public_url TEXT;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_apps_template_slug ON apps(template_slug);
CREATE INDEX IF NOT EXISTS idx_apps_owner_user_id ON apps(owner_user_id);

-- Orders remain no-payment for the MVP portfolio workflow, while preserving
-- the existing plan_type column used by the older pipeline.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS app_id UUID REFERENCES apps(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS portfolio_plan_type TEXT
  CHECK (portfolio_plan_type IS NULL OR portfolio_plan_type IN ('free_trial', 'one_time', 'managed'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'not_required_mvp'
  CHECK (payment_status IN ('not_required_mvp', 'pending_manual', 'paid', 'failed'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS deployment_strategy TEXT NOT NULL DEFAULT 'shared_template'
  CHECK (deployment_strategy IN ('shared_template', 'per_customer_repo'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_orders_app_id ON orders(app_id);
CREATE INDEX IF NOT EXISTS idx_orders_portfolio_plan_type ON orders(portfolio_plan_type);

CREATE TABLE IF NOT EXISTS portfolio_source_documents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id            UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  field_key         TEXT NOT NULL CHECK (field_key IN ('resume_pdf', 'cover_letter_pdf')),
  document_type     TEXT NOT NULL CHECK (document_type IN ('resume', 'cover_letter')),
  file_name         TEXT NOT NULL,
  storage_path      TEXT NOT NULL,
  public_url        TEXT,
  mime_type         TEXT NOT NULL DEFAULT 'application/pdf',
  size_bytes        BIGINT NOT NULL,
  extraction_status TEXT NOT NULL DEFAULT 'uploaded'
                      CHECK (extraction_status IN ('uploaded', 'extracting', 'extracted', 'failed')),
  extracted_text    TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_source_documents_app_id
  ON portfolio_source_documents(app_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_source_documents_type
  ON portfolio_source_documents(app_id, document_type);

CREATE TABLE IF NOT EXISTS app_builds (
  id                                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id                              UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  order_id                            UUID REFERENCES orders(id) ON DELETE SET NULL,
  status                              TEXT NOT NULL DEFAULT 'queued'
                                        CHECK (status IN ('draft', 'queued', 'generating', 'deploying', 'live', 'failed')),
  selected_plan                       JSONB NOT NULL,
  deployment_strategy                 TEXT NOT NULL DEFAULT 'shared_template'
                                        CHECK (deployment_strategy IN ('shared_template', 'per_customer_repo')),
  public_url                          TEXT,
  cost_estimate_cents                 INTEGER,
  ai_cost_estimate_cents              INTEGER,
  deployment_cost_estimate_cents      INTEGER,
  created_at                          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_builds_app_id ON app_builds(app_id);
CREATE INDEX IF NOT EXISTS idx_app_builds_order_id ON app_builds(order_id);
CREATE INDEX IF NOT EXISTS idx_app_builds_status ON app_builds(status);

CREATE TABLE IF NOT EXISTS app_build_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id   UUID NOT NULL REFERENCES app_builds(id) ON DELETE CASCADE,
  level      TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('info', 'warning', 'error')),
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_build_logs_build_id
  ON app_build_logs(build_id, created_at ASC);

INSERT INTO templates (
  slug, name, description, category, emoji,
  base_price_cents, is_system, requires_media, config_schema
) VALUES (
  'portfolio-website',
  'AI Portfolio Website',
  'A polished portfolio website generated from a resume, cover letter, and personal notes.',
  'career',
  'PF',
  0,
  TRUE,
  TRUE,
  $json$
  {
    "version": "1",
    "platform": "web",
    "ai_enabled": true,
    "ai_prompt_keys": [
      "gift_mode",
      "recipient_name",
      "recipient_context",
      "portfolio_notes",
      "tone",
      "target_roles",
      "preferred_theme"
    ],
    "steps": [
      {
        "id": "recipient",
        "title": "Who is this portfolio for?",
        "subtitle": "Gift it to someone else or build one for yourself.",
        "fields": [
          {
            "key": "gift_mode",
            "label": "Gift mode",
            "type": "select",
            "required": true,
            "default": "gift",
            "options": [
              { "value": "gift", "label": "Gift someone else" },
              { "value": "self", "label": "Gift myself" }
            ]
          },
          {
            "key": "recipient_name",
            "label": "Portfolio owner name",
            "type": "text",
            "required": true,
            "placeholder": "Siddharth Shankar"
          },
          {
            "key": "buyer_email",
            "label": "Your email",
            "type": "email",
            "required": true,
            "placeholder": "you@example.com"
          },
          {
            "key": "recipient_context",
            "label": "Relationship or context",
            "type": "textarea",
            "rows": 3,
            "placeholder": "Example: This is for my spouse who is applying for senior backend roles."
          }
        ]
      },
      {
        "id": "documents",
        "title": "Upload source documents",
        "subtitle": "PDF first for MVP. DOC/DOCX comes next.",
        "fields": [
          {
            "key": "resume_pdf",
            "label": "Resume PDF",
            "type": "document_upload",
            "required": true,
            "multiple": false,
            "max_files": 1,
            "max_size_mb": 8,
            "accept": ["application/pdf"]
          },
          {
            "key": "cover_letter_pdf",
            "label": "Cover letter PDF",
            "type": "document_upload",
            "required": false,
            "multiple": false,
            "max_files": 1,
            "max_size_mb": 8,
            "accept": ["application/pdf"]
          }
        ]
      },
      {
        "id": "direction",
        "title": "Shape the story",
        "subtitle": "These notes help the AI choose emphasis and tone.",
        "fields": [
          {
            "key": "portfolio_notes",
            "label": "Anything else to include",
            "type": "textarea",
            "rows": 5,
            "placeholder": "Projects, links, achievements, personality, or specific roles to target."
          },
          {
            "key": "target_roles",
            "label": "Target roles",
            "type": "text",
            "placeholder": "Senior Software Engineer, Platform Engineer"
          },
          {
            "key": "tone",
            "label": "Tone",
            "type": "select",
            "default": "confident",
            "options": [
              { "value": "confident", "label": "Confident and polished" },
              { "value": "warm", "label": "Warm and personal" },
              { "value": "technical", "label": "Technical and precise" }
            ]
          },
          {
            "key": "preferred_theme",
            "label": "Visual style",
            "type": "select",
            "default": "cinematic",
            "options": [
              { "value": "cinematic", "label": "Cinematic" },
              { "value": "classic", "label": "Classic" },
              { "value": "minimal", "label": "Minimal" }
            ]
          }
        ]
      },
      {
        "id": "plan",
        "title": "Choose a plan",
        "subtitle": "No payment in the MVP demo. Plan selection creates the build request.",
        "fields": [
          {
            "key": "selected_plan",
            "label": "Plan",
            "type": "plan_picker",
            "required": true,
            "options": [
              {
                "value": "free_trial",
                "label": "Free trial",
                "price": "$0",
                "badge": "2 days",
                "desc": "Public preview for two days"
              },
              {
                "value": "one_time",
                "label": "One-time",
                "price": "Manual",
                "badge": "MVP",
                "desc": "Public portfolio, pay-once flow later"
              },
              {
                "value": "managed",
                "label": "Managed",
                "price": "Manual",
                "badge": "Traffic-based later",
                "desc": "Public portfolio plus future maintenance"
              }
            ]
          }
        ]
      }
    ]
  }
  $json$
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  emoji = EXCLUDED.emoji,
  base_price_cents = EXCLUDED.base_price_cents,
  is_system = EXCLUDED.is_system,
  requires_media = EXCLUDED.requires_media,
  config_schema = EXCLUDED.config_schema,
  active = TRUE;
