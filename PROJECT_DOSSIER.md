---
generated_at: 2026-05-24T10:36:56.023835+00:00
commit_sha: b866652b32b1f6fa0e1ce398336f6bd9c0409f9b
crew: discoverer/v1
sections_present: [architecture, data, infra, security, hot_spots, tech_debt, incidents, questions]
---

# Architecture

AaaG ("Apps As A Gift") is a multi-service marketplace platform composed of four distinct runtime services and a shared database layer (`README.md:8-13`):

| Service | Tech | Port | Purpose |
|---------|------|------|---------|
| `platform/` | Next.js 14 (TypeScript) | 3000 | Landing page, wizard, dashboard |
| `api/` | Go + Gin | 8080 | Orders, payments, app lifecycle |
| `ai-service/` | Python FastAPI | 8000 | Claude-powered content generation |
| `supabase/` | PostgreSQL | — | DB schema + migrations |

## Platform (Next.js 14)

The customer-facing frontend is a Next.js 14 application written in TypeScript (`platform/package.json`, `platform/next.config.ts`). It serves the landing page, the personalization wizard, and the buyer/recipient dashboard. The project uses ESLint (`platform/eslint.config.mjs`), PostCSS (`platform/postcss.config.mjs`), and is structured with `platform/app/` (App Router pages/layouts), `platform/lib/` (shared utilities), `platform/public/` (static assets), and `platform/scripts/` (build/utility scripts).

## API (Go + Gin)

The backend API is written in Go using the Gin HTTP framework (`api/go.mod`). It runs on port 8080 (`README.md:10`) and is responsible for order management, payment processing, and app lifecycle orchestration. The entry point is `api/cmd/server` (`README.md:34`), with internal logic organized under `api/internal/`. Webhook handling is present at `api/internal/handlers/webhooks.go` (noted as a TODO/FIXME-heavy file, indicating active development of payment/event webhook flows).

## AI Service (Python FastAPI)

The AI service is a Python FastAPI application (`ai-service/main.py`) running on port 8000 (`README.md:11`). It uses the Anthropic Claude API for content generation, with the API key injected via environment variable `ANTHROPIC_API_KEY` (`ai-service/.env.example`). Dependencies are declared in `ai-service/requirements.txt`. Internal logic is split between `ai-service/core/` (core generation logic) and `ai-service/routers/` (FastAPI route definitions).

## Database (Supabase / PostgreSQL)

The persistence layer is a hosted Supabase PostgreSQL instance. Schema is version-controlled under `supabase/migrations/`, with the initial schema defined in `supabase/migrations/001_init.sql` (`README.md:40-41`).

## Templates

Pre-built micro-app templates live under `templates/`, each as a standalone Next.js application (`README.md:12`). Current templates include `event-app`, `personal-diary`, `portfolio-website`, `recipe-app`, `travel-planner`, and `trip-game` (`templates/` directory tree).

## Build Phases

The system is designed for incremental delivery (`README.md:44-49`):
- **Phase 0** — Landing page + waitlist
- **Phase 1** — Manual MVP (Google Form → hand-deployed → Stripe payment link)
- **Phase 2** — Automation (Go API + AI service + Vercel auto-deploy)
- **Phase 3** — Full platform (dashboard, 4 templates, ProductHunt launch)

## API / OpenAPI Specification

An OpenAPI specification is maintained under `openspec/`, with a configuration file at `openspec/config.yaml` and incremental changes tracked in `openspec/changes/`.

## Automation & Hooks

Agent automation hooks are stored in `.claude/hooks/` and include: audit logging (`audit-log.sh`), auto PR drafting (`auto-draft-pr.sh`), cost tracking (`cost-tracker.sh`), email notification (`notify-email.sh`), and a suite of protection hooks for destructive operations, env files, git pushes, and production (`protect-destructive.sh`, `protect-env.sh`, `protect-git-push.sh`, `protect-prod.sh`), plus a security scanner (`security-scan.sh`) — all with 1 touch in the last 90 days indicating recent initial setup (`.claude/hooks/` directory).

---

# Data model & flows

## Database Schema

The canonical schema is defined in `supabase/migrations/` and initialized via `supabase/migrations/001_init.sql` (`README.md:40-41`). All services interact with the same Supabase PostgreSQL instance.

## Core Data Entities (inferred from service responsibilities)

Based on service responsibilities cited in `README.md:8-13`, the data model supports at minimum:

- **Orders** — managed by the Go API (`api/internal/`, port 8080), representing a buyer's purchase of a personalized micro-app.
- **Payments** — processed through the Go API; webhook events from payment providers (e.g., Stripe) are handled in `api/internal/handlers/webhooks.go`.
- **App Lifecycle records** — tracking the state of each generated/deployed micro-app, also owned by the Go API (`README.md:10`).
- **Generated content** — produced by the AI service (`ai-service/core/`, `ai-service/routers/`) via Claude API calls, keyed to an order.
- **Waitlist entries** — captured during Phase 0 (`README.md:45`).

## Primary Data Flow: Order & Generation

The end-to-end flow for a personalized app order follows this sequence, derived from service roles (`README.md:8-13`, `README.md:44-49`):

1. **Buyer visits platform** → `platform/` (Next.js, port 3000) renders the wizard UI.
2. **Buyer submits personalization form** → `platform/` POSTs order data to the Go API (`api/`, port 8080).
3. **Go API creates order record** → persisted to Supabase PostgreSQL (`supabase/migrations/001_init.sql`).
4. **Go API triggers AI content generation** → calls `ai-service/` (FastAPI, port 8000) with order parameters.
5. **AI service calls Anthropic Claude** → using `ANTHROPIC_API_KEY` (`ai-service/.env.example`), routes defined in `ai-service/routers/`, core logic in `ai-service/core/`.
6. **AI service returns generated content** → Go API stores result and updates app lifecycle state in Supabase.
7. **Payment processing** → Go API handles Stripe (or equivalent) payment; webhook callbacks received at `api/internal/handlers/webhooks.go`.
8. **App deployment** → In Phase 2+, Go API triggers Vercel auto-deploy of the appropriate template from `templates/` (`README.md:48`).
9. **Buyer/recipient views dashboard** → `platform/` reads app status and links from Supabase via the Go API.

## Environment & Secrets Flow

Each service declares its required secrets via `.env.example` files:
- `ai-service/.env.example` — `ANTHROPIC_API_KEY` and AI service configuration.
- `api/.env.example` — all API keys (payment provider, Supabase credentials, etc.) (`README.md:32`).

Secrets are injected at runtime via environment variables; no secrets are committed to the repository (enforced by `.gitignore` and the `protect-env.sh` hook in `.claude/hooks/protect-env.sh`).

## OpenAPI Contract

The inter-service and external API contract is maintained in `openspec/config.yaml` with change history in `openspec/changes/`, providing a versioned schema for request/response data shapes flowing between `platform/`, `api/`, and `ai-service/`.

# Infra & deploy topology

## Service Inventory & Ports

AaaG is composed of four distinct runtime services and a shared managed database layer (`README.md:8-13`):

| Service | Runtime | Local Port | Role |
|---------|---------|-----------|------|
| `platform/` | Next.js 14 (TypeScript) | 3000 | Frontend — landing page, wizard, dashboard |
| `api/` | Go + Gin | 8080 | Backend — orders, payments, app lifecycle |
| `ai-service/` | Python FastAPI | 8000 | AI — Claude-powered content generation |
| `supabase/` | PostgreSQL (hosted) | — | Persistence — schema + migrations |

Each service is independently runnable and communicates over HTTP. No container orchestration or service mesh configuration is present in the repository at this commit.

## Platform (Next.js 14)

The customer-facing frontend is a Next.js 14 TypeScript application (`platform/package.json`, `platform/next.config.ts`). It uses the App Router, with pages and layouts under `platform/app/`, shared utilities under `platform/lib/`, static assets under `platform/public/`, and build/utility scripts under `platform/scripts/`. Tooling includes ESLint (`platform/eslint.config.mjs`) and PostCSS (`platform/postcss.config.mjs`).

Local development is started with `npm run dev` (`README.md:37`). The planned production deployment target is **Vercel auto-deploy**, referenced as part of Phase 2 automation (`README.md:48`).

## API (Go + Gin)

The backend API is written in Go using the Gin HTTP framework, with dependencies declared in `api/go.mod`. The server entry point is `api/cmd/server` (`README.md:34`), and internal logic is organized under `api/internal/`. Active webhook handling for payment/event callbacks is located at `api/internal/handlers/webhooks.go` (flagged as a TODO/FIXME-heavy file, indicating in-progress development). The service is started locally via `go run ./cmd/server` (`README.md:34`).

## AI Service (Python FastAPI)

The AI service is a Python FastAPI application with its entry point at `ai-service/main.py`. It runs on port 8000 (`README.md:11`) and is launched with `uvicorn main:app --reload --port 8000` (`README.md:27`). Dependencies are declared in `ai-service/requirements.txt`. Internal structure separates core generation logic (`ai-service/core/`) from FastAPI route definitions (`ai-service/routers/`). The Anthropic Claude API key is injected via the `ANTHROPIC_API_KEY` environment variable, declared in `ai-service/.env.example`.

## Database (Supabase / PostgreSQL)

The persistence layer is a **hosted Supabase PostgreSQL** instance — not self-hosted. The database schema is version-controlled under `supabase/migrations/`, with the initial schema applied via `supabase/migrations/001_init.sql` (`README.md:40-41`). Setup requires creating a Supabase project at supabase.com and running the migration SQL manually in the Supabase SQL editor (`README.md:39-41`). No local Postgres or Docker Compose configuration is present in the repository.

## Templates

Pre-built micro-app templates are stored as standalone Next.js applications under `templates/` (`README.md:12`). The six current templates are: `event-app`, `personal-diary`, `portfolio-website`, `recipe-app`, `travel-planner`, and `trip-game` (directory tree: `templates/`). In Phase 2+, the Go API is planned to trigger Vercel auto-deploy of the appropriate template upon order completion (`README.md:48`).

## Secrets & Environment Configuration

Each service declares its required secrets via `.env.example` files, which are committed to the repository as templates:

- `ai-service/.env.example` — Anthropic API key and AI service configuration.
- `api/.env.example` — all API keys (payment provider, Supabase credentials, etc.) (`README.md:32`).

Actual `.env` files are excluded from version control via `.gitignore`. The `.claude/hooks/protect-env.sh` hook enforces that env files are not committed or read by agents. Secrets are referenced by name only and injected at runtime via environment variables.

## CI/CD & Automation

**No CI pipeline configuration files** (e.g., GitHub Actions workflows, CircleCI, etc.) are present in the repository at this commit (`CI files: none found`).

Agent-level automation hooks are present in `.claude/hooks/` and include: audit logging (`audit-log.sh`), auto PR drafting (`auto-draft-pr.sh`), cost tracking (`cost-tracker.sh`), email notification (`notify-email.sh`), and protection hooks for destructive operations, env files, git pushes, and production (`protect-destructive.sh`, `protect-env.sh`, `protect-git-push.sh`, `protect-prod.sh`), plus a security scanner (`security-scan.sh`). All were introduced in a single recent commit (1 touch each in the last 90 days, `.claude/hooks/` directory).

## OpenAPI Contract

An OpenAPI specification is maintained under `openspec/`, with the primary configuration at `openspec/config.yaml` and incremental change history tracked in `openspec/changes/`. This provides the versioned API contract governing request/response shapes between `platform/`, `api/`, and `ai-service/`.

## Deployment Phases

The infrastructure is designed for incremental delivery (`README.md:44-49`):

- **Phase 0** — Static landing page + waitlist capture only.
- **Phase 1** — Manual MVP: Google Form intake → hand-deployed apps → Stripe payment link (no automation).
- **Phase 2** — Automated pipeline: Go API + AI service + **Vercel auto-deploy** of templates.
- **Phase 3** — Full platform: dashboard, 4 templates, ProductHunt launch.

At the current commit, the repository contains code for all services but **no automated deployment pipeline** is wired up in CI. Production deployment to Vercel (for `platform/` and templates) and hosting for `api/` and `ai-service/` are planned but not yet configured in the repository.

# Security posture

## Secrets Management

Secrets are declared by name only via `.env.example` template files committed to the repository — `ai-service/.env.example` (holds `ANTHROPIC_API_KEY`) and `api/.env.example` (holds payment provider keys, Supabase credentials, and all other API keys) (`README.md:32`). Actual `.env` files are excluded from version control via `.gitignore`. An agent-level hook at `.claude/hooks/protect-env.sh` enforces that env files are not read or committed by automation agents. No secret values are inlined anywhere in the repository at this commit.

## Agent-Level Protection Hooks

A suite of protection hooks was introduced in a single recent commit (1 touch each, `.claude/hooks/` directory):

- **`.claude/hooks/protect-env.sh`** — blocks agent reads/commits of env files.
- **`.claude/hooks/protect-destructive.sh`** — guards against destructive operations.
- **`.claude/hooks/protect-git-push.sh`** — restricts direct pushes (enforcing branch protection workflows).
- **`.claude/hooks/protect-prod.sh`** — prevents unauthorized production changes.
- **`.claude/hooks/security-scan.sh`** — runs a security scan as part of the agent workflow.
- **`.claude/hooks/audit-log.sh`** — maintains an audit trail of agent actions.

These hooks represent the primary automated security controls present in the repository at this commit. All were introduced together, indicating they are newly established and not yet battle-tested.

## No CI Pipeline

**No CI/CD pipeline configuration files** are present in the repository (`CI files: none found`). There are no GitHub Actions workflows, CircleCI configs, or equivalent. This means:

- No automated secret scanning (e.g., `git-secrets`, `truffleHog`) runs on pull requests.
- No automated dependency vulnerability scanning (e.g., `dependabot`, `govulncheck`, `pip-audit`) is wired up.
- No SAST tooling runs on merge.
- The only automated security controls are the agent-level hooks in `.claude/hooks/`, which apply to agent-driven commits only, not human-authored commits.

This is a significant gap: human contributors pushing code bypass all automated security checks.

## Webhook Handler — Unfinished Security Logic

The payment/event webhook handler at `api/internal/handlers/webhooks.go` is flagged as the top TODO/FIXME-heavy file in the repository (`api/internal/handlers/webhooks.go:1`). Webhook handlers are a high-risk surface: they receive unauthenticated inbound HTTP requests from external payment providers (e.g., Stripe) and must validate cryptographic signatures before acting on payload data. The presence of unresolved TODOs here is a concrete risk indicator — signature verification, idempotency guards, and replay-attack protections may be incomplete or absent.

## Dependency Surface

Three dependency manifests are present:

- **`ai-service/requirements.txt`** — Python dependencies for the FastAPI + Anthropic Claude service. No lockfile beyond `requirements.txt` is cited; pinning discipline is unknown from the readings.
- **`api/go.mod`** — Go module dependencies (with `api/go.sum` providing cryptographic integrity verification of the module graph, which is a Go-native security control).
- **`platform/package.json`** — Node.js dependencies for Next.js 14, with `platform/package-lock.json` present, providing deterministic installs.

Go's `go.sum` (`api/go.sum`) and npm's `package-lock.json` (`platform/package-lock.json`) provide supply-chain integrity for those two services. The Python service has only `requirements.txt` with no equivalent hash-pinned lockfile cited, leaving it more exposed to dependency substitution attacks.

## Authentication & Authorization Surface

No authentication middleware, JWT validation, API key enforcement, or CORS configuration files are cited in the repository readings. The `platform/next.config.ts` is present but its contents are not detailed in the readings. The Go API (`api/internal/`) and AI service (`ai-service/routers/`) expose HTTP endpoints whose access controls cannot be assessed from the available readings — this is an unknown risk area.

## Database Security

The persistence layer is a **hosted Supabase PostgreSQL** instance (`README.md:39-41`). Schema is version-controlled under `supabase/migrations/`. Row-level security (RLS) policies, database roles, and connection string handling cannot be assessed from the available readings, as only the migration directory structure is cited — not the migration SQL content.

## Next.js Configuration

The Next.js platform configuration is present at `platform/next.config.ts`. Security-relevant settings (Content Security Policy headers, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, etc.) cannot be assessed from the available readings, as the file contents are not provided.

## Summary of Key Risks

| Risk | Severity | Evidence |
|------|----------|----------|
| No CI pipeline — no automated secret/vuln scanning for human commits | High | `CI files: none found` |
| Webhook handler has unresolved TODOs (signature verification may be incomplete) | High | `api/internal/handlers/webhooks.go:1` |
| Python dependency lockfile absent (supply-chain risk) | Medium | `ai-service/requirements.txt` only; no hash-pinned lockfile cited |
| Agent protection hooks are newly introduced and untested at scale | Medium | All `.claude/hooks/` files show 1 touch in 90 days |
| Auth/CORS controls on API and AI service endpoints unverifiable from readings | Unknown | No auth middleware files cited in `api/internal/` or `ai-service/routers/` |
| Database RLS and connection security unverifiable from readings | Unknown | Only `supabase/migrations/` directory cited, not SQL content |

# Hot spots

**`api/internal/handlers/webhooks.go`** is the single most flagged file in the repository — it is the only file identified as TODO/FIXME-heavy (`api/internal/handlers/webhooks.go:1`). Webhook handlers are a critical, high-risk surface: they receive inbound HTTP requests from external payment providers (e.g., Stripe) and must perform cryptographic signature verification, idempotency enforcement, and replay-attack protection before acting on any payload. Unresolved TODOs here indicate that one or more of these controls may be incomplete or absent. This is the highest-priority hot spot in the codebase.

**`.claude/hooks/` — entire hooks directory** was introduced in a single commit (every hook file shows exactly 1 touch in the last 90 days: `.claude/hooks/audit-log.sh`, `.claude/hooks/auto-draft-pr.sh`, `.claude/hooks/cost-tracker.sh`, `.claude/hooks/notify-email.sh`, `.claude/hooks/protect-destructive.sh`, `.claude/hooks/protect-env.sh`, `.claude/hooks/protect-git-push.sh`, `.claude/hooks/protect-prod.sh`, `.claude/hooks/protect-prod.sh`, `.claude/hooks/security-scan.sh`). These hooks are the primary automated security and governance controls for agent-driven operations. Being newly introduced and never iterated on, they are untested at scale and represent a fragile single point of failure for the entire agent-safety model.

**`ai-service/main.py` + `ai-service/routers/` + `ai-service/core/`** — the AI service is the only service with no hash-pinned dependency lockfile (`ai-service/requirements.txt` only; no `requirements.lock` or equivalent is cited). Every call to this service invokes the Anthropic Claude API using `ANTHROPIC_API_KEY` (`ai-service/.env.example`), making it both a cost-amplification risk (unbounded token spend if called in a loop or by an unauthenticated caller) and a supply-chain risk (unpinned Python dependencies).

**No CI pipeline** — `CI files: none found`. There are no GitHub Actions workflows or equivalent. This means every human-authored commit bypasses all automated secret scanning, dependency vulnerability scanning, and SAST. The agent-level hooks in `.claude/hooks/` apply only to agent-driven commits, leaving human contributors entirely unguarded.

---

# Tech-debt register

| # | Item | Location | Severity | Notes |
|---|------|----------|----------|-------|
| TD-01 | Unresolved TODOs/FIXMEs in webhook handler — signature verification, idempotency, and replay protection may be incomplete | `api/internal/handlers/webhooks.go:1` | **Critical** | Payment integrity depends on this; Stripe requires HMAC signature validation before any action |
| TD-02 | No CI/CD pipeline — zero automated testing, secret scanning, or vulnerability scanning on any commit | `CI files: none found` | **High** | Human commits bypass all automated controls; no green-CI gate before merge |
| TD-03 | Python dependency lockfile absent — `requirements.txt` only, no hash-pinned lockfile | `ai-service/requirements.txt` | **High** | Supply-chain risk; contrast with Go (`api/go.sum`) and Node (`platform/package-lock.json`) which both have integrity files |
| TD-04 | Agent protection hooks are newly introduced and unvalidated — all show 1 touch in 90 days | `.claude/hooks/protect-env.sh`, `.claude/hooks/protect-git-push.sh`, `.claude/hooks/protect-prod.sh`, `.claude/hooks/security-scan.sh` | **Medium** | No evidence of iterative hardening; hook logic has never been exercised under real failure conditions |
| TD-05 | Database setup is manual — no migration tooling, no local Postgres/Docker Compose | `supabase/migrations/` (directory only); `README.md:39-41` | **Medium** | Developer onboarding requires manual SQL execution in Supabase web UI; no repeatable local dev environment |
| TD-06 | Auth/CORS controls on Go API and AI service endpoints are unverifiable — no middleware files cited | `api/internal/` (directory only); `ai-service/routers/` (directory only) | **Medium** | Cannot confirm that endpoints require authentication; AI service calling Claude with no auth gate = unbounded cost exposure |
| TD-07 | Next.js security headers (CSP, `X-Frame-Options`, HSTS, etc.) unverifiable | `platform/next.config.ts` | **Medium** | File exists but contents not available in readings; cannot confirm hardened HTTP headers are set |
| TD-08 | Supabase Row-Level Security (RLS) policies unverifiable | `supabase/migrations/` (directory only) | **Medium** | Migration SQL content not available in readings; RLS may be absent, exposing all rows to any authenticated Supabase client |
| TD-09 | Vercel auto-deploy pipeline for templates is planned but not implemented | `README.md:48`; `templates/` directory | **Low** | Phase 2 feature; six templates exist (`event-app`, `personal-diary`, `portfolio-website`, `recipe-app`, `travel-planner`, `trip-game`) but no deploy wiring is present |
| TD-10 | OpenAPI spec change history tracked manually in `openspec/changes/` with no validation gate | `openspec/config.yaml`; `openspec/changes/` | **Low** | No CI to validate spec against actual service implementations; contract drift is undetectable |

---

# Recent incidents (last 90d)

No incidents are recorded in the repository readings for the last 90 days. The commit history shows a single merge commit (`b866652 Merge pull request #6 from sagacioussid02/minions/eng/dossier-refresh-project_dossier-md-96e01-15ce4a47`) as the most recent entry, which is a documentation/dossier refresh — not an incident response or hotfix. No `INCIDENTS.md`, post-mortem documents, or incident-tagged commits are present in the cited repository structure.

**Observation:** The absence of recorded incidents is consistent with the project being in early build phases (Phase 0–2 per `README.md:44-49`) with no production traffic yet, rather than evidence of a stable system. The high-churn files in the last 90 days are exclusively tooling and configuration files (`.claude/hooks/`, `.gitignore`, `CLAUDE.md`, `CONTRIBUTING.md`) — all showing exactly 1 touch — indicating the project is in initial scaffolding, not active incident response.

---

# Open questions for operator

1. **Webhook signature verification status** — `api/internal/handlers/webhooks.go` is the only TODO/FIXME-heavy file in the codebase. Before any real payment traffic is processed, the operator must confirm: Is Stripe HMAC signature validation implemented and tested? Are idempotency keys enforced to prevent double-fulfillment? This is a blocking question for Phase 2 go-live.

2. **CI/CD pipeline decision** — There is no CI pipeline in the repository (`CI files: none found`). Does the operator want a GitHub Actions pipeline introduced? At minimum, this should cover: lint + test on PR, secret scanning (e.g., `truffleHog`/`gitleaks`), Go vulnerability check (`govulncheck`), Python audit (`pip-audit`), and npm audit. Without CI, human commits bypass all automated security controls.

3. **Authentication model for Go API and AI service** — No auth middleware files are cited under `api/internal/` or `ai-service/routers/`. What is the intended authentication mechanism for API consumers? (JWT, API keys, Supabase auth tokens?) The AI service in particular — if callable without authentication — represents unbounded Anthropic API cost exposure.

4. **Supabase Row-Level Security** — The migration SQL content under `supabase/migrations/` is not available in the readings. Has RLS been enabled on all tables? Which tables are exposed to the Supabase anon key vs. the service role key? This is a data-isolation question that must be answered before any multi-tenant order data is stored.

5. **Python dependency pinning policy** — `ai-service/requirements.txt` has no hash-pinned lockfile equivalent to Go's `api/go.sum` or npm's `platform/package-lock.json`. Should a `pip-compile`-generated `requirements.lock` (with hashes) be adopted for the AI service? This is a supply-chain integrity question.

6. **Production hosting topology for Go API and AI service** — The README references Vercel auto-deploy for `platform/` and templates (`README.md:48`), but no hosting target is specified for `api/` (Go + Gin, port 8080) or `ai-service/` (FastAPI, port 8000). Where will these services be hosted in production? (Fly.io, Railway, GCP Cloud Run, AWS ECS, etc.) This decision gates Phase 2 automation work.

7. **Template deployment automation scope** — Six templates exist under `templates/` (`event-app`, `personal-diary`, `portfolio-website`, `recipe-app`, `travel-planner`, `trip-game`) but the Phase 3 target is "4 templates" (`README.md:49`). Which four templates are in scope for Phase 3? Should the remaining two be archived, or is the count in the README stale?

8. **Agent hook validation** — All `.claude/hooks/` files were introduced in a single commit with no subsequent iteration (1 touch each in 90 days). Has the operator reviewed and tested each hook under failure conditions? In particular: Does `protect-git-push.sh` correctly block direct pushes to `main` for all agent roles? Does `security-scan.sh` have a defined pass/fail threshold?
