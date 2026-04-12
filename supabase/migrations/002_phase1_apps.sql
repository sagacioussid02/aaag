-- Phase 1 migration: apps table only (no orders/users/templates required)
-- Run this in your Neon SQL editor at console.neon.tech

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS apps (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subdomain    TEXT UNIQUE NOT NULL,
  config       JSONB NOT NULL,
  ai_content   JSONB,
  status       TEXT NOT NULL DEFAULT 'live'
                 CHECK (status IN ('generating', 'live', 'expired', 'deleted')),
  expires_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS apps_status_idx ON apps (status);
CREATE INDEX IF NOT EXISTS apps_created_at_idx ON apps (created_at DESC);
