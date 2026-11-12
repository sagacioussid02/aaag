# AaaG — Apps As A Gift

> A marketplace for personalized micro-apps. No code. Ready in minutes.

## Services

| Service | Tech | Port | Purpose |
|---------|------|------|------|
| `platform/` | Next.js 14 (TypeScript) | 3000 | Landing page, wizard, dashboard |
| `api/` | Go + Gin | 8080 | Orders, payments, app lifecycle |
| `ai-service/` | Python FastAPI | 8000 | Claude-powered content generation |
| `supabase/` | PostgreSQL | — | DB schema + migrations |
| `templates/` | Next.js (per template) | — | Pre-built micro-app templates |

## Quick Start

For detailed setup instructions for each service, see the service-specific README:

- **[platform/README.md](platform/README.md)** — Next.js platform setup
- **[api/README.md](api/README.md)** — Go API setup
- **[ai-service/README.md](ai-service/README.md)** — Python AI service setup

### Quick Overview

```bash
# 1. AI Service (Python)
cd ai-service
cp .env.example .env    # add ANTHROPIC_API_KEY
pip install -r requirements.lock
uvicorn main:app --reload --port 8000

# 2. Go API (in another terminal)
cd api
cp .env.example .env    # see api/README.md for required keys
go mod tidy
go run ./cmd/server

# 3. Platform (Next.js, in another terminal)
cd platform
npm install
npm run dev

# 4. Database
# Create a Supabase project at supabase.com
# Run supabase/migrations/001_init.sql in the SQL editor
```

## Local Development

### Using Docker Compose (Recommended)

The fastest way to run the entire stack locally (platform, api, ai-service, and Supabase) is with docker-compose:

```bash
docker-compose up
```

This starts all four services on their standard ports:
- **Platform** (Next.js): http://localhost:3000
- **Go API**: http://localhost:8080
- **AI Service** (FastAPI): http://localhost:8000
- **Supabase** (PostgreSQL): localhost:5432

### Environment Variables

Before starting the stack, ensure the following environment variables are set:

**ai-service/**
- `ANTHROPIC_API_KEY` — Your Anthropic API key (required for Claude content generation)
- `DATABASE_URL` — PostgreSQL connection string (auto-set by docker-compose)

**api/**
- `STRIPE_SECRET_KEY` — Your Stripe secret key (required for payment processing)
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret
- `SUPABASE_URL` — Your Supabase project URL
- `SUPABASE_ANON_KEY` — Your Supabase anonymous key
- `AI_SERVICE_URL` — AI service URL (auto-set to http://ai-service:8000 by docker-compose)

**platform/**
- `NEXT_PUBLIC_API_URL` — Public URL for the Go API (auto-set to http://localhost:8080 by docker-compose)
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous key

Copy `.env.example` files to `.env` in each service directory and populate with your actual credentials. For local development, docker-compose sets the service-to-service URLs automatically.

### Manual Setup (If Not Using Docker Compose)

If you prefer to run services individually, follow the Quick Overview section above and refer to each service's README for detailed setup steps.

## CI Pipeline

### Three-Service Matrix Build

Every pull request and push to `main` triggers a GitHub Actions CI pipeline that runs three parallel jobs across the entire stack:

1. **Node.js Job** (`platform/`)
   - Runs: `npm ci && npm run build && npm test`
   - Validates: Next.js platform builds and tests pass

2. **Go Job** (`api/`)
   - Runs: `go mod tidy && go test ./...`
   - Validates: Go API tests pass and dependencies are clean

3. **Python Job** (`ai-service/`)
   - Runs: `pip install -r requirements.lock && pytest`
   - Validates: AI service tests pass with pinned dependency graph

### Required Checks for Merge

All three jobs must pass (be green) before a PR can merge to `main`:

- ✅ **Node.js** — platform/ build and tests
- ✅ **Go** — api/ tests
- ✅ **Python** — ai-service/ tests with requirements.lock

Branch protection rules enforce this server-side — the "Merge" button is disabled until all checks pass.

### Dependency Pinning

- **ai-service/** — Uses `requirements.lock` (generated via pip-compile) to ensure deterministic Python dependency resolution in CI and production
- **api/** — Uses `go.mod` and `go.sum` for deterministic Go dependency management
- **platform/** — Uses `package-lock.json` for deterministic npm dependency management

## Branch Protection

The `main` branch is protected with the following rules:

1. **All PR Checks Must Pass**
   - The three-job CI matrix (Node.js, Go, Python) must be green
   - No code can merge if any job fails

2. **Pull Request Review Required**
   - At least one peer engineer review is required before merge
   - The operator reviews and approves before final merge
   - No self-reviews; authors cannot approve their own work

3. **No Direct Commits to Main**
   - All work must be done on feature branches following the naming convention: `minions/<role>/<short-summary>`
   - Examples: `minions/engineer/ci-github-actions`, `minions/engineer/ai-error-handling`
   - Branch protection blocks direct pushes to `main` — the Git server will reject them

4. **Merge Commit Strategy**
   - PRs are merged using the "Squash and merge" or "Create a merge commit" strategy
   - Rebasing is allowed; force-pushing to `main` is forbidden

### Workflow for Merging

1. Create a feature branch: `git checkout -b minions/<role>/<summary>`
2. Make your changes and commit with clear, conventional commit messages
3. Push your branch and open a PR targeting `main`
4. Wait for peer review (another engineer)
5. Address review feedback
6. Once peer approves and CI is green, the operator reviews
7. Operator approves and merges the PR — you do not merge your own work

For more details, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for:
- Three-service topology and data flow
- Inter-service request/response schemas
- Environment variable requirements
- Deployment architecture

## Build Order (MVP Phases)

- **Phase 0** — Landing page + waitlist (validate before building)
- **Phase 1** — Manual MVP: Google Form → you deploy by hand → Stripe payment link
- **Phase 2** — Automate: Go API + AI service + Vercel auto-deploy
- **Phase 3** — Full platform: dashboard, 4 templates, ProductHunt launch

## Current Sprint

See [SPRINT_N.md](SPRINT_N.md) for the current sprint plan: "Establish automated quality gates and close critical correctness gaps" — establishing CI infrastructure, auditing dependencies, and triaging technical debt.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for branch naming, PR process, and TODO/FIXME triage framework.

## Technical Debt

All TODO and FIXME annotations are tracked in the [triage framework](docs/TRIAGE_FRAMEWORK.md). The current triage report is available at [docs/TRIAGE_REPORT.md](docs/TRIAGE_REPORT.md) (generated during Sprint N).
