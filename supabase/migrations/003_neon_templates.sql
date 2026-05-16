-- AaaG — Neon Templates Schema
-- Run in your Neon SQL editor (or via DATABASE_URL connection)
-- Brings templates, versioning, media, and creator fields to the Neon DB
-- that the Next.js platform reads from directly.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── templates ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS templates (
  id                UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              TEXT     UNIQUE NOT NULL,
  name              TEXT     NOT NULL,
  description       TEXT,
  category          TEXT,                         -- gift | travel | event | game
  emoji             TEXT     DEFAULT '',
  preview_url       TEXT,
  config_schema     JSONB    NOT NULL DEFAULT '{}',
  base_price_cents  INTEGER  NOT NULL DEFAULT 999,
  active            BOOLEAN  DEFAULT TRUE,
  -- creator marketplace (NULL = system template)
  creator_id        TEXT,                         -- Clerk user ID of template creator
  creator_name      TEXT,
  revenue_share_pct SMALLINT DEFAULT 0 CHECK (revenue_share_pct BETWEEN 0 AND 70),
  is_system         BOOLEAN  DEFAULT TRUE,
  requires_media    BOOLEAN  DEFAULT FALSE,       -- true if schema has image_upload fields
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- If 001_init.sql already created templates, CREATE TABLE IF NOT EXISTS will not
-- add newer marketplace columns. Backfill them explicitly for Supabase.
ALTER TABLE templates ADD COLUMN IF NOT EXISTS emoji TEXT DEFAULT '';
ALTER TABLE templates ADD COLUMN IF NOT EXISTS creator_id TEXT;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS creator_name TEXT;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS revenue_share_pct SMALLINT DEFAULT 0 CHECK (revenue_share_pct BETWEEN 0 AND 70);
ALTER TABLE templates ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT TRUE;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS requires_media BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_templates_active   ON templates(active);
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_creator  ON templates(creator_id) WHERE creator_id IS NOT NULL;

-- ─── template_versions ────────────────────────────────────────────────────────
-- Allows creators to publish updates without breaking deployed apps.
-- Deployed apps snapshot the config_schema at generation time.

CREATE TABLE IF NOT EXISTS template_versions (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id     UUID    NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  version         TEXT    NOT NULL,               -- semver e.g. "1.0.0"
  config_schema   JSONB   NOT NULL,               -- snapshot of schema at this version
  vercel_proj_id  TEXT,
  changelog       TEXT,
  is_current      BOOLEAN DEFAULT FALSE,
  published_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_template_versions_current
  ON template_versions(template_id) WHERE is_current = TRUE;

-- ─── apps table changes ───────────────────────────────────────────────────────
-- Phase 1 apps table (from 002_phase1_apps.sql) has no template_slug column.
-- We add it so the app viewer knows which renderer to use.

ALTER TABLE apps ADD COLUMN IF NOT EXISTS template_slug TEXT NOT NULL DEFAULT 'recipe-app';

-- Backfill: existing rows are all recipe apps
UPDATE apps SET template_slug = 'recipe-app' WHERE template_slug = 'recipe-app';

-- ─── app_media ────────────────────────────────────────────────────────────────
-- Operational record for every uploaded media file.
-- The signed URLs stored here and in apps.config are kept in sync by
-- the signed URL refresh job that runs before app expiry.

CREATE TABLE IF NOT EXISTS app_media (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id       UUID    NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  field_key    TEXT    NOT NULL,                  -- matches config_schema field key
  storage_path TEXT    NOT NULL,                  -- "app-media/apps/{id}/photos/0.jpg"
  public_url   TEXT    NOT NULL,                  -- pre-resolved signed URL
  mime_type    TEXT    NOT NULL,
  size_bytes   BIGINT  NOT NULL,
  sort_order   INTEGER DEFAULT 0,                 -- order within multi-upload fields
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_media_app_id   ON app_media(app_id);
CREATE INDEX IF NOT EXISTS idx_app_media_field_key ON app_media(app_id, field_key);

-- ─── seed: system templates ───────────────────────────────────────────────────

INSERT INTO templates (
  slug, name, description, category, emoji,
  base_price_cents, is_system, requires_media, config_schema
) VALUES
(
  'recipe-app',
  'Recipe App',
  'A personalized cookbook — curated recipes based on their cuisine preferences, dietary needs, and cooking level.',
  'gift', '🍳', 999, TRUE, FALSE,
  '{
    "version": "1",
    "platform": "web",
    "ai_enabled": true,
    "ai_prompt_keys": ["recipient_name", "cuisines", "dietary_restrictions", "skill_level", "message"],
    "steps": [
      {
        "id": "recipient",
        "title": "Who is this for?",
        "subtitle": "Tell us about the lucky recipient.",
        "fields": [
          { "key": "recipient_name", "label": "Their name",                             "type": "text",  "required": true,  "placeholder": "Sarah" },
          { "key": "buyer_email",    "label": "Your email (we''ll send the link here)", "type": "email", "required": true,  "placeholder": "you@email.com" }
        ]
      },
      {
        "id": "preferences",
        "title": "What do they love to eat?",
        "subtitle": "Claude will use this to pick the perfect recipes.",
        "fields": [
          { "key": "cuisines",              "label": "Favourite cuisines (pick all that apply)", "type": "multiselect",
            "options": ["Italian", "Indian", "Mexican", "Chinese", "Japanese", "American", "Mediterranean", "French"] },
          { "key": "dietary_restrictions",  "label": "Any dietary restrictions?",                "type": "multiselect",
            "options": ["Vegetarian", "Vegan", "Gluten-free", "Dairy-free", "Halal", "Kosher", "None"] },
          { "key": "skill_level",           "label": "Their cooking skill level",                "type": "select",
            "options": [
              { "value": "Beginner",      "label": "Beginner" },
              { "value": "Intermediate",  "label": "Intermediate" },
              { "value": "Advanced",      "label": "Advanced" }
            ]
          }
        ]
      },
      {
        "id": "personalization",
        "title": "Make it personal",
        "subtitle": "These details appear inside the app when they open it.",
        "fields": [
          { "key": "message", "label": "Personal message (shown inside the app)", "type": "textarea",
            "placeholder": "Happy Birthday! I made this just for you ❤️", "max_length": 500 },
          { "key": "theme",   "label": "Pick a colour theme", "type": "select", "required": true, "default": "Warm Rose",
            "options": [
              { "value": "Warm Rose",       "label": "Warm Rose" },
              { "value": "Ocean Blue",      "label": "Ocean Blue" },
              { "value": "Forest Green",    "label": "Forest Green" },
              { "value": "Sunset Orange",   "label": "Sunset Orange" },
              { "value": "Midnight Purple", "label": "Midnight Purple" }
            ]
          }
        ]
      },
      {
        "id": "plan",
        "title": "How long should it last?",
        "subtitle": "All plans are free during early access.",
        "fields": [
          { "key": "plan_type", "label": "Choose a plan", "type": "plan_picker", "required": true,
            "options": [
              { "value": "spark",  "label": "Spark",  "price": "$9.99",    "badge": "Free for now", "desc": "30 days · up to 5 people" },
              { "value": "moment", "label": "Moment", "price": "$24.99",   "badge": "Free for now", "desc": "90 days · up to 20 people" },
              { "value": "keep",   "label": "Keep",   "price": "$4.99/mo", "badge": "Free for now", "desc": "Forever · unlimited people" }
            ]
          }
        ]
      }
    ]
  }'
),
(
  'personal-diary',
  'Personal Diary',
  'A beautiful photo diary app — personalized with your photos and a heartfelt message.',
  'gift', '📔', 999, TRUE, TRUE,
  '{
    "version": "1",
    "platform": "web",
    "ai_enabled": true,
    "ai_prompt_keys": ["recipient_name", "personal_message"],
    "steps": [
      {
        "id": "recipient",
        "title": "Who is this for?",
        "subtitle": "Tell us about the lucky recipient.",
        "fields": [
          { "key": "recipient_name", "label": "Their name",                             "type": "text",  "required": true,  "placeholder": "Sarah",         "max_length": 50 },
          { "key": "buyer_email",    "label": "Your email (we''ll send the link here)", "type": "email", "required": true                                               },
          { "key": "app_name",       "label": "Name the app",                           "type": "text",  "required": false, "placeholder": "Sarah''s Corner", "max_length": 40,
            "hint": "Shown in the browser tab and app header — leave blank to use their name" }
        ]
      },
      {
        "id": "photos",
        "title": "Add some photos",
        "subtitle": "These appear inside the app. Upload 1–6 favourites.",
        "fields": [
          { "key": "photos", "label": "Photos", "type": "image_upload",
            "required": false, "multiple": true, "max_files": 6, "max_size_mb": 5,
            "accept": ["image/jpeg", "image/png", "image/webp"] }
        ]
      },
      {
        "id": "personalization",
        "title": "Make it personal",
        "subtitle": "These details appear inside the app when they open it.",
        "fields": [
          { "key": "personal_message", "label": "Your personal message", "type": "textarea",
            "placeholder": "Happy Birthday! I made this just for you ❤️", "max_length": 500 },
          { "key": "theme", "label": "Colour theme", "type": "select", "required": true, "default": "Warm Rose",
            "options": [
              { "value": "Warm Rose",       "label": "Warm Rose" },
              { "value": "Ocean Blue",      "label": "Ocean Blue" },
              { "value": "Forest Green",    "label": "Forest Green" },
              { "value": "Sunset Orange",   "label": "Sunset Orange" },
              { "value": "Midnight Purple", "label": "Midnight Purple" }
            ]
          }
        ]
      },
      {
        "id": "plan",
        "title": "How long should it last?",
        "subtitle": "All plans are free during early access.",
        "fields": [
          { "key": "plan_type", "label": "Choose a plan", "type": "plan_picker", "required": true,
            "options": [
              { "value": "spark",  "label": "Spark",  "price": "$9.99",    "badge": "Free for now", "desc": "30 days · up to 5 people" },
              { "value": "moment", "label": "Moment", "price": "$24.99",   "badge": "Free for now", "desc": "90 days · up to 20 people" },
              { "value": "keep",   "label": "Keep",   "price": "$4.99/mo", "badge": "Free for now", "desc": "Forever · unlimited people" }
            ]
          }
        ]
      }
    ]
  }'
),
(
  'travel-planner',
  'Travel Planner',
  'Your group''s private AI trip companion — day-by-day itinerary, restaurant picks, and packing list.',
  'travel', '✈️', 1499, TRUE, FALSE,
  '{
    "version": "1",
    "platform": "web",
    "ai_enabled": true,
    "ai_prompt_keys": ["group_name", "destination", "travel_dates", "group_size", "budget_level", "interests", "members"],
    "steps": [
      {
        "id": "trip",
        "title": "Tell us about the trip",
        "fields": [
          { "key": "group_name",    "label": "Group name",       "type": "text",   "required": true,  "placeholder": "The Sharma Family" },
          { "key": "destination",   "label": "Destination",      "type": "text",   "required": true,  "placeholder": "Smoky Mountains, TN" },
          { "key": "travel_dates",  "label": "Travel dates",     "type": "text",   "required": true,  "placeholder": "March 15–20, 2025" },
          { "key": "group_size",    "label": "Group size",       "type": "number", "required": true,  "min": 1, "max": 50 },
          { "key": "buyer_email",   "label": "Your email",       "type": "email",  "required": true  }
        ]
      },
      {
        "id": "preferences",
        "title": "Trip preferences",
        "fields": [
          { "key": "budget_level",  "label": "Budget level",     "type": "select", "required": true,
            "options": [{"value":"budget","label":"Budget"},{"value":"mid-range","label":"Mid-range"},{"value":"luxury","label":"Luxury"}] },
          { "key": "hotel_style",   "label": "Accommodation",    "type": "select", "required": false,
            "options": [{"value":"cabin","label":"Cabin"},{"value":"hotel","label":"Hotel"},{"value":"airbnb","label":"Airbnb"}] },
          { "key": "interests",     "label": "Interests",        "type": "multiselect",
            "options": ["Hiking","Food","Local culture","Shopping","Nightlife","Museums","Outdoor adventure","Relaxation"] }
        ]
      },
      {
        "id": "members",
        "title": "Who''s coming?",
        "subtitle": "List member names, one per line.",
        "fields": [
          { "key": "members", "label": "Trip members", "type": "textarea", "placeholder": "Dad\nMom\nPriya\nRohan", "hint": "One name per line" }
        ]
      },
      {
        "id": "plan",
        "title": "How long should it last?",
        "fields": [
          { "key": "plan_type", "label": "Choose a plan", "type": "plan_picker", "required": true,
            "options": [
              { "value": "spark",  "label": "Spark",  "price": "$14.99",   "badge": "Free for now", "desc": "30 days · up to 5 people" },
              { "value": "moment", "label": "Moment", "price": "$24.99",   "badge": "Free for now", "desc": "90 days · up to 20 people" },
              { "value": "keep",   "label": "Keep",   "price": "$4.99/mo", "badge": "Free for now", "desc": "Forever · unlimited people" }
            ]
          }
        ]
      }
    ]
  }'
),
(
  'trip-game',
  'Trip Game',
  'Custom Pictionary and trivia for your road trip — prompts specific to your destination and crew.',
  'game', '🎮', 999, TRUE, FALSE,
  '{
    "version": "1",
    "platform": "web",
    "ai_enabled": true,
    "ai_prompt_keys": ["group_name", "destination", "game_type", "players", "trip_theme", "age_range"],
    "steps": [
      {
        "id": "group",
        "title": "Your group",
        "fields": [
          { "key": "group_name",  "label": "Group name",    "type": "text",  "required": true, "placeholder": "Smoky Mountains Crew" },
          { "key": "destination", "label": "Destination",   "type": "text",  "required": true, "placeholder": "Smoky Mountains" },
          { "key": "players",     "label": "Player names",  "type": "textarea", "placeholder": "Jake\nMaria\nSidd\nSaloni", "hint": "One name per line" },
          { "key": "buyer_email", "label": "Your email",    "type": "email", "required": true }
        ]
      },
      {
        "id": "game",
        "title": "Game settings",
        "fields": [
          { "key": "game_type",   "label": "Game type",     "type": "select", "required": true,
            "options": [
              {"value":"pictionary",       "label":"Pictionary"},
              {"value":"trivia",           "label":"Trivia"},
              {"value":"scavenger_hunt",   "label":"Scavenger Hunt"},
              {"value":"would_you_rather", "label":"Would You Rather"}
            ]
          },
          { "key": "trip_theme",  "label": "Trip theme",    "type": "select",
            "options": [{"value":"road_trip","label":"Road Trip"},{"value":"hiking","label":"Hiking"},{"value":"beach","label":"Beach"},{"value":"city","label":"City"}] },
          { "key": "age_range",   "label": "Age range",     "type": "select",
            "options": [{"value":"adults","label":"Adults only"},{"value":"mixed","label":"Mixed ages"},{"value":"family","label":"Family-friendly"}] }
        ]
      },
      {
        "id": "plan",
        "title": "How long should it last?",
        "fields": [
          { "key": "plan_type", "label": "Choose a plan", "type": "plan_picker", "required": true,
            "options": [
              { "value": "spark",  "label": "Spark",  "price": "$9.99",    "badge": "Free for now", "desc": "30 days · up to 5 people" },
              { "value": "moment", "label": "Moment", "price": "$24.99",   "badge": "Free for now", "desc": "90 days · up to 20 people" },
              { "value": "keep",   "label": "Keep",   "price": "$4.99/mo", "badge": "Free for now", "desc": "Forever · unlimited people" }
            ]
          }
        ]
      }
    ]
  }'
),
(
  'event-app',
  'Event App',
  'Invites, RSVP, schedule, and memories — a dedicated app for your wedding, reunion, or party.',
  'event', '🎉', 999, TRUE, FALSE,
  '{
    "version": "1",
    "platform": "web",
    "ai_enabled": true,
    "ai_prompt_keys": ["event_name", "host_name", "event_date", "message"],
    "steps": [
      {
        "id": "event",
        "title": "Tell us about the event",
        "fields": [
          { "key": "event_name",  "label": "Event name",   "type": "text",  "required": true,  "placeholder": "Priya & Raj''s Wedding" },
          { "key": "host_name",   "label": "Host name",    "type": "text",  "required": true,  "placeholder": "Priya & Raj" },
          { "key": "event_date",  "label": "Event date",   "type": "text",  "required": true,  "placeholder": "June 15, 2025" },
          { "key": "buyer_email", "label": "Your email",   "type": "email", "required": true  }
        ]
      },
      {
        "id": "personalization",
        "title": "Personalize it",
        "fields": [
          { "key": "message", "label": "Welcome message for guests", "type": "textarea", "max_length": 500 },
          { "key": "theme",   "label": "Colour theme", "type": "select", "required": true, "default": "Warm Rose",
            "options": [
              { "value": "Warm Rose",       "label": "Warm Rose" },
              { "value": "Ocean Blue",      "label": "Ocean Blue" },
              { "value": "Forest Green",    "label": "Forest Green" },
              { "value": "Sunset Orange",   "label": "Sunset Orange" },
              { "value": "Midnight Purple", "label": "Midnight Purple" }
            ]
          }
        ]
      },
      {
        "id": "plan",
        "title": "How long should it last?",
        "fields": [
          { "key": "plan_type", "label": "Choose a plan", "type": "plan_picker", "required": true,
            "options": [
              { "value": "spark",  "label": "Spark",  "price": "$9.99",    "badge": "Free for now", "desc": "30 days · up to 5 people" },
              { "value": "moment", "label": "Moment", "price": "$24.99",   "badge": "Free for now", "desc": "90 days · up to 20 people" },
              { "value": "keep",   "label": "Keep",   "price": "$4.99/mo", "badge": "Free for now", "desc": "Forever · unlimited people" }
            ]
          }
        ]
      }
    ]
  }'
)
ON CONFLICT (slug) DO NOTHING;

-- ─── pg_cron: expire apps daily at midnight UTC ───────────────────────────────
-- Uncomment after enabling pg_cron extension in your database settings.
-- SELECT cron.schedule('expire-apps', '0 0 * * *', $$
--   UPDATE apps SET status = 'expired'
--   WHERE status = 'live'
--     AND expires_at IS NOT NULL
--     AND expires_at < NOW();
-- $$);
