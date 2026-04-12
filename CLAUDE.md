# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AaaG (Apps As A Gift) is a marketplace for personalized micro-apps. Users customize a template, pay via Stripe, and receive a deployed PWA link within minutes.

## Services & Ports

| Service | Tech | Port |
|---------|------|------|
| `platform/` | Next.js 16 (TypeScript) | 3000 |
| `api/` | Go + Gin | 8080 |
| `ai-service/` | Python FastAPI | 8000 |

## Commands

### AI Service (Python/FastAPI)
```bash
cd ai-service
python -m uvicorn main:app --reload --port 8000
```

### Go API
```bash
cd api
go run ./cmd/server          # run server
go build ./...               # build all packages
go test ./...                # run all tests
go test ./internal/...       # run tests in a specific package
```

### Platform (Next.js)
```bash
cd platform
npm run dev                  # dev server on :3000
npm run build                # production build
npm run lint                 # eslint
```

### Database
Run migrations in order against Supabase SQL editor:
- `supabase/migrations/001_init.sql`
- `supabase/migrations/002_phase1_apps.sql`

## Architecture

### Core App Generation Pipeline

The central flow triggered after a Stripe payment:

```
Stripe webhook → Go API (handlers/webhooks.go)
  → creates order + app records in Supabase
  → calls ai-service POST /generate  (services/generator.go)
      → routes to recipe/travel/game/event router by template_slug
      → calls Claude API (core/claude.py) to generate personalized content
  → calls Vercel API to deploy template with config (services/deployer.go)
  → updates app record (status: live, subdomain, expires_at)
  → sends email via Resend (services/notifier.go)
```

### Go API (`api/`)

- **Entry:** `cmd/server/main.go` — wires Gin router, injects service dependencies into handlers
- **Handlers:** `internal/handlers/` — HTTP layer only; business logic lives in services
- **Services:** `internal/services/` — `generator.go` (calls AI service), `deployer.go` (calls Vercel API)
- **Internal routes** (`/internal/*`) are protected by `InternalAuthMiddleware` via a secret header
- Go module: `github.com/yourusername/aaag-api`

### AI Service (`ai-service/`)

- `main.py` dispatches to the correct generator by `template_slug`
- Each router (`routers/recipe.py`, etc.) has a `generate(user_config)` async function
- `core/claude.py` wraps the Anthropic SDK: `ask()` for text, `ask_json()` for structured JSON responses
- Model used: `claude-sonnet-4-6`

### Platform (`platform/`)

- Next.js App Router; uses Clerk for auth (`@clerk/nextjs`)
- Database: Neon Postgres via `@neondatabase/serverless` (note: README mentions Supabase but `package.json` uses Neon)
- `app/api/` — Next.js API routes acting as thin proxies to the Go API
- `lib/` — shared DB client and types

### Templates (`templates/`)

Each template (`recipe-app`, `travel-planner`, `trip-game`, `event-app`) is a standalone Next.js app. At deploy time, Vercel receives a `NEXT_PUBLIC_APP_CONFIG` env var pointing to config stored in Supabase Storage. The template fetches this config on first load to render personalized content.

## Environment Variables

**`api/.env`** — `VERCEL_TOKEN`, `VERCEL_TEAM_ID`, `RESEND_API_KEY`, `AI_SERVICE_URL`, Supabase creds, Stripe keys

**`ai-service/.env`** — `ANTHROPIC_API_KEY`

**`platform/.env`** — Clerk keys, Neon DB connection string
