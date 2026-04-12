-- AaaG — Initial Schema
-- Run this in your Supabase SQL editor or via `supabase db push`

-- Users (extends Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email               TEXT UNIQUE NOT NULL,
  name                TEXT,
  stripe_customer_id  TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Templates (managed by you, not users)
CREATE TABLE IF NOT EXISTS templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE NOT NULL,     -- 'recipe-app', 'travel-planner'
  name            TEXT NOT NULL,
  description     TEXT,
  category        TEXT,                     -- 'gift' | 'travel' | 'event' | 'game'
  preview_url     TEXT,
  config_schema   JSONB NOT NULL DEFAULT '{}', -- JSON Schema defining the customization form
  base_price_cents INTEGER NOT NULL DEFAULT 999,
  active          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Orders (one per purchase)
CREATE TABLE IF NOT EXISTS orders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES users(id),
  template_id         UUID REFERENCES templates(id),
  template_slug       TEXT NOT NULL,
  plan_type           TEXT NOT NULL CHECK (plan_type IN ('spark', 'moment', 'keep', 'gift')),
  amount_cents        INTEGER NOT NULL,
  stripe_payment_id   TEXT,
  stripe_session_id   TEXT,
  user_config         JSONB NOT NULL DEFAULT '{}', -- user's customization answers
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Generated Apps (the actual micro-app after payment)
CREATE TABLE IF NOT EXISTS apps (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id                UUID REFERENCES orders(id),
  subdomain               TEXT UNIQUE NOT NULL,       -- recipe-sarah-abc123
  vercel_deployment_id    TEXT,
  config_storage_path     TEXT,                       -- Supabase Storage path for config JSON
  ai_content              JSONB,                      -- Claude-generated content (cached)
  status                  TEXT NOT NULL DEFAULT 'generating'
                            CHECK (status IN ('generating', 'live', 'expired', 'deleted')),
  expires_at              TIMESTAMPTZ,                -- NULL = forever (Keep plan)
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_apps_order_id ON apps(order_id);
CREATE INDEX IF NOT EXISTS idx_apps_status ON apps(status);
CREATE INDEX IF NOT EXISTS idx_apps_expires_at ON apps(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_apps_subdomain ON apps(subdomain);

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Templates: public read
CREATE POLICY "templates_public_read" ON templates FOR SELECT USING (active = TRUE);

-- Users: only own row
CREATE POLICY "users_own_row" ON users FOR ALL USING (auth.uid() = id);

-- Orders: only own orders
CREATE POLICY "orders_own" ON orders FOR SELECT USING (auth.uid() = user_id);

-- Apps: only own apps
CREATE POLICY "apps_own" ON apps FOR SELECT
  USING (order_id IN (SELECT id FROM orders WHERE user_id = auth.uid()));

-- Seed: initial templates
INSERT INTO templates (slug, name, description, category, base_price_cents, config_schema) VALUES
(
  'recipe-app',
  'Recipe App',
  'A personalized cookbook app — curated recipes based on their cuisine preferences and dietary needs.',
  'gift',
  999,
  '{
    "steps": [
      {
        "id": "recipient",
        "title": "Who is this for?",
        "fields": [
          {"key": "recipient_name", "label": "Their name", "type": "text", "required": true},
          {"key": "buyer_email", "label": "Your email", "type": "email", "required": true}
        ]
      },
      {
        "id": "preferences",
        "title": "What do they love to eat?",
        "fields": [
          {"key": "cuisines", "label": "Favorite cuisines", "type": "multiselect",
           "options": ["Italian", "Indian", "Mexican", "Chinese", "Japanese", "American", "Mediterranean"]},
          {"key": "dietary_restrictions", "label": "Dietary restrictions", "type": "multiselect",
           "options": ["Vegetarian", "Vegan", "Gluten-free", "Dairy-free", "Halal", "None"]},
          {"key": "skill_level", "label": "Cooking skill level", "type": "select",
           "options": ["Beginner", "Intermediate", "Advanced"]}
        ]
      },
      {
        "id": "personalization",
        "title": "Make it personal",
        "fields": [
          {"key": "message", "label": "Personal message", "type": "textarea"},
          {"key": "theme", "label": "Color theme", "type": "select",
           "options": ["Warm Rose", "Ocean Blue", "Forest Green", "Sunset Orange"]}
        ]
      }
    ]
  }'
),
(
  'travel-planner',
  'Travel Planner',
  'A private AI trip companion — day-by-day itinerary, restaurant picks, packing list for your group.',
  'travel',
  1499,
  '{}'
),
(
  'trip-game',
  'Trip Game',
  'Custom Pictionary and trivia for your road trip — prompts specific to your destination and crew.',
  'game',
  999,
  '{}'
),
(
  'event-app',
  'Event App',
  'Invites, RSVP, schedule, and memories — a dedicated app for your wedding, reunion, or party.',
  'event',
  999,
  '{}'
)
ON CONFLICT (slug) DO NOTHING;

-- pg_cron job: mark expired apps daily at midnight UTC
-- Requires pg_cron extension (enable in Supabase dashboard → Database → Extensions)
-- SELECT cron.schedule('expire-apps', '0 0 * * *', $$
--   UPDATE apps SET status = 'expired'
--   WHERE status = 'live'
--     AND expires_at IS NOT NULL
--     AND expires_at < NOW();
-- $$);