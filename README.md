# AaaG — Apps As A Gift

> A marketplace for personalized micro-apps. No code. Ready in minutes.

## Services

| Service | Tech | Port | Purpose |
|---------|------|------|---------|
| `platform/` | Next.js 14 (TypeScript) | 3000 | Landing page, wizard, dashboard |
| `api/` | Go + Gin | 8080 | Orders, payments, app lifecycle |
| `ai-service/` | Python FastAPI | 8000 | Claude-powered content generation |
| `supabase/` | PostgreSQL | — | DB schema + migrations |
| `templates/` | Next.js (per template) | — | Pre-built micro-app templates |

## Quick Start

### 1. AI Service
```bash
cd ai-service
cp .env.example .env    # add ANTHROPIC_API_KEY
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 2. Go API
```bash
cd api
cp .env.example .env    # add all keys
go mod tidy
go run ./cmd/server
```

### 3. Platform (Next.js)
```bash
cd platform
npm install
npm run dev
```

### 4. Database
- Create a Supabase project at supabase.com
- Run `supabase/migrations/001_init.sql` in the SQL editor

## Architecture
See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for full technical plan, user flow, pricing model, and build phases.

## Build Order (MVP Phases)
- **Phase 0** — Landing page + waitlist (validate before building)
- **Phase 1** — Manual MVP: Google Form → you deploy by hand → Stripe payment link
- **Phase 2** — Automate: Go API + AI service + Vercel auto-deploy
- **Phase 3** — Full platform: dashboard, 4 templates, ProductHunt launch

## Current Sprint

See [SPRINT_N.md](SPRINT_N.md) for the current sprint plan: "Lay the Foundation" — establishing CI infrastructure, auditing dependencies, and triaging technical debt.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for branch naming, PR process, and TODO/FIXME triage framework.

## Technical Debt

All TODO and FIXME annotations are tracked in the [triage framework](docs/TRIAGE_FRAMEWORK.md). The current triage report is available at [docs/TRIAGE_REPORT.md](docs/TRIAGE_REPORT.md) (generated during Sprint N).
