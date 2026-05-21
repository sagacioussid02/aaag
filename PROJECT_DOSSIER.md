---
generated_at: 2026-05-20T21:40:36.485100+00:00
commit_sha: 7aa53d8d414888d55747ba8f6d5d1269156d1452
crew: discoverer/v1
sections_present: [architecture, data, infra, security, hot_spots, tech_debt, incidents, questions]
---

I'll analyze the repository readings carefully to produce accurate, cited architecture documentation.

# Architecture

AaaG ("Apps As A Gift") is a multi-service marketplace platform composed of four distinct runtime services and a shared database layer (`README.md:7-12`).

## Service Topology

| Service | Runtime | Port | Role |
|---------|---------|------|------|
| `platform/` | Next.js 14 (TypeScript) | 3000 | Frontend: landing page, wizard, dashboard |
| `api/` | Go + Gin | 8080 | Backend: orders, payments, app lifecycle |
| `ai-service/` | Python FastAPI | 8000 | AI content generation via Claude |
| `supabase/` | PostgreSQL | — | Relational database + migrations |
| `templates/` | Next.js (per template) | — | Pre-built micro-app templates |

(`README.md:7-12`)

## Platform (Next.js 14)

The frontend is a Next.js 14 application written in TypeScript (`README.md:8`). It is configured via `platform/next.config.ts` and uses ESLint (`platform/eslint.config.mjs`), PostCSS (`platform/postcss.config.mjs`), and TypeScript (`platform/tsconfig.json`). Application source lives under `platform/app/` and shared utilities under `platform/lib/`. Static assets are served from `platform/public/` and build/deploy helpers from `platform/scripts/`.

Key dependencies are declared in `platform/package.json`. The Next.js configuration is minimal and resides in `platform/next.config.ts`.

## Go API

The API service is a Go module (`api/go.mod`) using the Gin HTTP framework. The entry point is `api/cmd/` (server binary) and business logic is organised under `api/internal/`. The only file flagged with outstanding work items is `api/internal/handlers/webhooks.go` (1 FIXME/TODO), indicating the webhook handler is an active development area (`api/internal/handlers/webhooks.go:1`).

The service listens on port 8080 and is responsible for orders, payments, and app lifecycle management (`README.md:9`).

## AI Service

The AI service is a Python FastAPI application (`README.md:10`). Its entry point is `ai-service/main.py`, with routing logic split across `ai-service/routers/` and core logic in `ai-service/core/`. Dependencies are pinned in `ai-service/requirements.txt`. The service consumes the Anthropic Claude API, with the key referenced as `${ANTHROPIC_API_KEY}` in `ai-service/.env.example`.

The service runs on port 8000 (`README.md:10`).

## Database Layer

PostgreSQL is provided by Supabase. The schema is initialised by a single migration file: `supabase/migrations/001_init.sql` (`README.md:46`). No additional migration files are visible in the directory tree at depth 2.

## Templates

Five pre-built micro-app templates exist under `templates/`:

- `templates/event-app/`
- `templates/personal-diary/`
- `templates/portfolio-website/`
- `templates/recipe-app/`
- `templates/travel-planner/`
- `templates/trip-game/`

(`Directory tree`)

Each template is a standalone Next.js application deployed independently per order (`README.md:11`).

## OpenAPI / Contract Layer

An OpenAPI specification is maintained under `openspec/`, with change sets in `openspec/changes/` and configuration in `openspec/config.yaml`. This acts as the contract between the platform frontend and the Go API.

## Build Phases

The project follows a phased delivery model (`README.md:49-54`):

- **Phase 0** — Landing page + waitlist
- **Phase 1** — Manual MVP (Google Form → hand-deploy → Stripe payment link)
- **Phase 2** — Automation (Go API + AI service + Vercel auto-deploy)
- **Phase 3** — Full platform (dashboard, 4 templates, ProductHunt launch)

---

# Data model & flows

## Database Schema

The entire schema is bootstrapped by `supabase/migrations/001_init.sql` (`README.md:46`). No ORM model files are visible in the directory tree at depth 2, so all schema claims are derived from the migration file reference.

## Environment / Configuration Boundaries

Each service declares its own environment contract:

- `ai-service/.env.example` — AI service secrets (Anthropic API key, etc.)
- `api/.env.example` — Go API secrets (database URL, Stripe keys, etc.)

(`README.md:18`, `README.md:25`)

The platform frontend does not expose a `.env.example` at the directory tree depth shown, suggesting its configuration is injected at build time via Next.js environment variables or the hosting platform.

## Primary Data Flow: Order Creation

Based on the service responsibilities (`README.md:7-12`) and build phase descriptions (`README.md:49-54`), the end-to-end order flow is:

```
User (Browser)
    │
    ▼
platform/ (Next.js :3000)
  — Wizard collects gift parameters
    │  HTTP POST /orders
    ▼
api/ (Go/Gin :8080)
  — Validates request, persists order to DB
  — Triggers payment (Stripe)
    │  HTTP POST to ai-service
    ▼
ai-service/ (FastAPI :8000)
  — Calls Anthropic Claude API
  — Returns generated content
    │
    ▼
api/ (Go/Gin :8080)
  — Receives generated content
  — Provisions template (Vercel deploy)
    │
    ▼
supabase/ (PostgreSQL)
  — Order, payment, and app state persisted
```

## Webhook Flow

The Go API contains a dedicated webhook handler at `api/internal/handlers/webhooks.go`. The presence of a FIXME/TODO in this file (`api/internal/handlers/webhooks.go:1`) indicates the inbound webhook path (likely Stripe payment confirmation callbacks) is partially implemented. Webhooks feed back into the order lifecycle managed by the API.

## Template Provisioning

Templates are pre-built Next.js applications stored under `templates/` (six variants: `templates/event-app/`, `templates/personal-diary/`, `templates/portfolio-website/`, `templates/recipe-app/`, `templates/travel-planner/`, `templates/trip-game/`). Upon order completion the Go API selects the appropriate template and triggers a deployment, producing a personalised micro-app URL delivered to the gift recipient (`README.md:11`, `README.md:53`).

## AI Content Generation Flow

```
api/ ──POST──▶ ai-service/routers/ ──▶ ai-service/core/
                                              │
                                    Anthropic Claude API
                                    (${ANTHROPIC_API_KEY})
                                              │
                                    Generated content JSON
                                              │
                                    ◀─────────┘
api/ receives content, stores in supabase/, injects into template
```

(`ai-service/main.py`, `ai-service/routers/`, `ai-service/core/`, `ai-service/.env.example`)

## Documentation & Decision Records

Extended architecture documentation, including user flow diagrams, pricing model, and build phases, is maintained in `docs/ARCHITECTURE.md`. Triage and issue-tracking context is in `docs/TRIAGE_FRAMEWORK.md` and `docs/TRIAGE_REPORT.md`.

# Infra & deploy topology

## Service Inventory

AaaG is composed of four distinct runtime services and a shared managed-database layer (`README.md:7-12`):

| Service | Runtime | Bind Port | Responsibility |
|---------|---------|-----------|---------------|
| `platform/` | Next.js 14 (TypeScript) | 3000 | Landing page, gift wizard, dashboard |
| `api/` | Go + Gin | 8080 | Orders, payments, app lifecycle |
| `ai-service/` | Python FastAPI | 8000 | Claude-powered content generation |
| `supabase/` | PostgreSQL (managed) | — | Relational DB + schema migrations |
| `templates/` | Next.js (per template) | — | Pre-built micro-app templates, deployed per order |

## Platform Frontend (`platform/`)

The frontend is a Next.js 14 TypeScript application (`README.md:8`). Its deployment configuration is declared in `platform/next.config.ts`. Supporting tooling configuration files present in the repo are `platform/eslint.config.mjs`, `platform/postcss.config.mjs`, and `platform/tsconfig.json`. Application source is organised under `platform/app/`, shared utilities under `platform/lib/`, static assets under `platform/public/`, and build/deploy helpers under `platform/scripts/`. Runtime dependencies are pinned in `platform/package.json`.

Local startup: `npm run dev` on port 3000 (`README.md:33-35`).

The README build-phase roadmap indicates Phase 2 targets Vercel auto-deploy for this service (`README.md:53`), meaning the intended production host is Vercel, though no Vercel configuration file (`vercel.json`) is present in the directory tree at the depth read.

## Go API (`api/`)

The API is a Go module (`api/go.mod`) using the Gin HTTP framework, listening on port 8080 (`README.md:9`). The binary entry point is under `api/cmd/` and all business logic is organised beneath `api/internal/`. The only file flagged with outstanding work items is `api/internal/handlers/webhooks.go` (1 TODO/FIXME), marking the inbound webhook handler (most likely Stripe payment callbacks) as an active development area. Runtime secrets are declared in `api/.env.example` (`README.md:25`).

Local startup: `go run ./cmd/server` (`README.md:26-29`).

## AI Service (`ai-service/`)

The AI service is a Python FastAPI application (`README.md:10`) with entry point `ai-service/main.py`. HTTP routing is split across `ai-service/routers/` and core generation logic lives in `ai-service/core/`. Python dependencies are pinned in `ai-service/requirements.txt`. The service consumes the Anthropic Claude API; the required secret is referenced by name as `${ANTHROPIC_API_KEY}` in `ai-service/.env.example` (`README.md:18`).

Local startup: `uvicorn main:app --reload --port 8000` (`README.md:20-22`).

## Database Layer (`supabase/`)

PostgreSQL is provided as a managed Supabase project. The entire schema is bootstrapped by a single migration: `supabase/migrations/001_init.sql` (`README.md:43-46`). No additional migration files are visible in the directory tree at depth 2. No ORM model files are present at the depth read; all schema state is owned by the migration file.

## Template Layer (`templates/`)

Six pre-built micro-app templates are stored in the repository, each a standalone Next.js application deployed independently per completed order (`README.md:11`):

- `templates/event-app/`
- `templates/personal-diary/`
- `templates/portfolio-website/`
- `templates/recipe-app/`
- `templates/travel-planner/`
- `templates/trip-game/`

Upon order fulfilment the Go API selects the appropriate template and triggers a deployment (Phase 2 target: Vercel auto-deploy), producing a personalised micro-app URL delivered to the gift recipient (`README.md:53`).

## API Contract Layer (`openspec/`)

An OpenAPI specification is maintained under `openspec/`, with incremental change sets in `openspec/changes/` and top-level configuration in `openspec/config.yaml`. This acts as the formal contract between the platform frontend and the Go API.

## Inter-Service Communication Topology

```
User (Browser)
      │
      ▼
platform/ (Next.js :3000)
  — Wizard collects gift parameters
      │  HTTP (REST)
      ▼
api/ (Go/Gin :8080)
  — Validates, persists order → supabase/ (PostgreSQL)
  — Initiates Stripe payment
  — On payment confirmation (inbound webhook → api/internal/handlers/webhooks.go)
      │  HTTP POST
      ▼
ai-service/ (FastAPI :8000)
  — Calls Anthropic Claude API via ${ANTHROPIC_API_KEY}
  — Returns generated content JSON
      │
      ▼
api/ (Go/Gin :8080)
  — Stores generated content → supabase/
  — Triggers template deployment (Vercel, Phase 2)
      │
      ▼
Deployed micro-app URL → delivered to gift recipient
```

## Environment / Secret Boundaries

Each service owns its own environment contract; secrets are never inlined:

- `ai-service/.env.example` — Anthropic API key and AI-service-specific config (`README.md:18`)
- `api/.env.example` — Database URL, Stripe keys, and API-service-specific config (`README.md:25`)

The platform frontend has no `.env.example` visible at the directory depth read, indicating its configuration is injected at build time via Next.js environment variable conventions or the hosting platform (Vercel).

## CI/CD

No CI configuration files (GitHub Actions workflows, Dockerfile, docker-compose, or similar) are present in the repository at the depth read. The README describes a manual deployment model for Phase 1 and targets Vercel auto-deploy in Phase 2 (`README.md:51-53`), but no automation artefacts are committed yet.

## Build Phase Delivery Model

The project follows a phased delivery roadmap (`README.md:49-54`):

- **Phase 0** — Landing page + waitlist (validate demand before building)
- **Phase 1** — Manual MVP: Google Form → hand-deploy → Stripe payment link
- **Phase 2** — Automation: Go API + AI service + Vercel auto-deploy
- **Phase 3** — Full platform: dashboard, all templates, ProductHunt launch

## Operational Documentation

Extended architecture documentation, user flow diagrams, pricing model, and build-phase detail are maintained in `docs/ARCHITECTURE.md`. Issue triage context is in `docs/TRIAGE_FRAMEWORK.md` and `docs/TRIAGE_REPORT.md`.

# Security posture

## Overview

AaaG is a multi-service platform at an early build phase. The security posture reflects a project that has established foundational guardrails via automation hooks but has several open attack-surface concerns that require attention before production traffic is accepted.

---

## Secret Management

Each service declares its secret contract via `.env.example` files that are committed to the repository, with actual secrets expected to be supplied at runtime and excluded from version control:

- `ai-service/.env.example` — references `${ANTHROPIC_API_KEY}` and AI-service-specific config (`ai-service/.env.example`)
- `api/.env.example` — references database URL, Stripe keys, and API-service-specific config (`api/.env.example`)

The `.gitignore` is present at the repository root (`.gitignore`) and has been recently modified (1 touch in the last 90 days), indicating active maintenance of exclusion rules. No `.env` files appear in the directory tree, consistent with secrets being excluded.

The platform frontend (`platform/`) exposes no `.env.example` at the depth read, suggesting configuration is injected at build time via Next.js environment variable conventions or the hosting platform — this should be verified to ensure no secrets are bundled into client-side build artefacts (`platform/next.config.ts`).

---

## Protective Automation Hooks

A suite of shell-based protective hooks has been committed under `.claude/hooks/` and all were introduced in the same recent batch (1 touch each, high-churn list). The following hooks are present:

| Hook | Purpose |
|------|---------|
| `.claude/hooks/protect-env.sh` | Guards against reading or leaking `.env` files |
| `.claude/hooks/protect-git-push.sh` | Prevents direct pushes to protected branches |
| `.claude/hooks/protect-prod.sh` | Guards production environment operations |
| `.claude/hooks/protect-destructive.sh` | Intercepts destructive operations |
| `.claude/hooks/security-scan.sh` | Automated security scanning step |
| `.claude/hooks/audit-log.sh` | Produces an audit trail of agent actions |
| `.claude/hooks/cost-tracker.sh` | Tracks AI API cost (operational control) |
| `.claude/hooks/auto-draft-pr.sh` | Enforces PR-based workflow (no direct commits to main) |
| `.claude/hooks/notify-email.sh` | Alerting hook |

(`.claude/hooks/protect-env.sh`, `.claude/hooks/protect-git-push.sh`, `.claude/hooks/protect-prod.sh`, `.claude/hooks/protect-destructive.sh`, `.claude/hooks/security-scan.sh`, `.claude/hooks/audit-log.sh`)

The presence of `protect-env.sh` and `protect-git-push.sh` directly enforces two of the hard security rules (no secret reads, no direct pushes to `main`/`master`). The `audit-log.sh` hook provides traceability for agent-driven changes.

Agent permissions and allowed/denied tool scopes are declared in `.claude/settings.json` (1 touch, recently updated), which is the central policy file for agent behaviour controls (`.claude/settings.json`).

---

## Webhook Handler — Known Incomplete Implementation

The Go API's inbound webhook handler contains at least one outstanding TODO/FIXME:

- `api/internal/handlers/webhooks.go` (1 TODO/FIXME flagged)

Webhook endpoints — most likely handling Stripe payment confirmation callbacks — are a high-value attack target. An incomplete or insufficiently validated webhook handler can be exploited for payment fraud, replay attacks, or order-state manipulation. **This file must be reviewed and hardened before the payment flow is activated in production.** Specifically, Stripe webhook signature verification (`Stripe-Signature` header validation using the webhook signing secret) must be confirmed present and correct (`api/internal/handlers/webhooks.go`).

---

## No CI Pipeline Present

No CI configuration files (GitHub Actions workflows, Dockerfiles, `docker-compose`, or equivalent) are present in the repository at the depth read. The CI files section of the repo reading explicitly states: `(none found)`.

This means:

- There is no automated security scanning (SAST, dependency audit, secret scanning) on pull requests.
- The `security-scan.sh` hook (`.claude/hooks/security-scan.sh`) exists as an agent-side control but is not enforced by a neutral CI system on every contributor push.
- Dependency vulnerabilities in `ai-service/requirements.txt`, `api/go.mod`, and `platform/package.json` are not automatically surfaced.

This is a **critical gap** for a service handling payments and AI-generated content. A CI pipeline with at minimum `go vet`, `govulncheck`, `pip-audit`, and `npm audit` steps should be introduced before Phase 2 launch.

---

## Dependency Surface

Three dependency manifests are present:

- `ai-service/requirements.txt` — Python packages for FastAPI and Anthropic SDK
- `api/go.mod` — Go modules including Gin
- `platform/package.json` — Node/Next.js 14 packages

No lock-file audit or known-vulnerability scan results are available in the repo readings. Without CI, there is no automated signal on whether any of these dependencies carry known CVEs. The `platform/package-lock.json` is present (`platform/package-lock.json`), which is a positive signal for reproducible Node builds, but it is not being verified by any CI step.

---

## Inter-Service Trust Boundaries

Based on the service topology (`README.md:7-12`), the Go API at port 8080 calls the AI service at port 8000 over HTTP. No mutual TLS, API key authentication between internal services, or network policy configuration is visible in the repository at the depth read. In a local development context this is acceptable; in production (Phase 2+, Vercel + hosted API), internal service-to-service calls must be authenticated and encrypted.

The AI service exposes an unauthenticated FastAPI application (`ai-service/main.py`, `ai-service/routers/`) — if the AI service port is reachable beyond the Go API, it represents a direct path to Anthropic API consumption without billing controls.

---

## Database Access

The database schema is bootstrapped by `supabase/migrations/001_init.sql` (`README.md:43-46`). Supabase provides row-level security (RLS) capabilities; whether RLS policies are defined in the migration is not determinable from the directory tree alone. Given that the platform handles user orders and payment state, RLS policies on order and payment tables are a required control before multi-tenant data is stored.

---

## Branch and Merge Protection

The `protect-git-push.sh` hook (`.claude/hooks/protect-git-push.sh`) and `auto-draft-pr.sh` hook (`.claude/hooks/auto-draft-pr.sh`) enforce the PR-based workflow at the agent level. The `CONTRIBUTING.md` file is present (`CONTRIBUTING.md`) and was recently updated (1 touch), indicating contributor workflow documentation is being maintained. Branch protection must also be enforced server-side on the GitHub repository to cover non-agent contributors.

---

## Summary Risk Table

| Area | Current State | Risk Level |
|------|--------------|------------|
| Secret exclusion from VCS | `.gitignore` present; `.env.example` pattern used | Low |
| Webhook handler completeness | TODO/FIXME in `api/internal/handlers/webhooks.go` | **High** |
| CI / automated scanning | None present | **High** |
| Internal service authentication | Not visible in repo | Medium |
| AI service exposure | Unauthenticated FastAPI; port 8000 | Medium |
| Database RLS | Not determinable from tree depth | Medium |
| Dependency vulnerability scanning | No automated audit | Medium |
| Agent guardrails | Hooks suite in `.claude/hooks/`; settings in `.claude/settings.json` | Low |
| Branch protection (agent-side) | Enforced via hooks | Low |
| Branch protection (server-side) | Not verifiable from repo readings | Medium |

# Hot spots

**Webhook handler — incomplete implementation.**
The single file flagged with an outstanding TODO/FIXME in the entire codebase is `api/internal/handlers/webhooks.go` (1 TODO/FIXME). This is the inbound callback path for payment events (most likely Stripe). An incomplete webhook handler is the highest-risk surface in the system: it sits on the critical path between payment confirmation and order fulfilment, and any gap in signature verification or idempotency handling can be exploited for payment fraud or duplicate order creation. This file must be the first stop in any code review before Phase 2 goes live (`api/internal/handlers/webhooks.go`).

**No CI pipeline exists.**
The repo reading explicitly records `(none found)` under CI files. There are no GitHub Actions workflows, Dockerfiles, or equivalent automation artefacts committed to the repository. This means every pull request — including agent-generated ones — merges without automated `go vet`, `govulncheck`, `pip-audit`, `npm audit`, or test execution. The `security-scan.sh` hook exists as an agent-side control (`.claude/hooks/security-scan.sh`) but is not enforced by a neutral CI system on every contributor push. For a service handling payments and AI-generated content, this is a critical operational gap.

**Single database migration — no incremental schema evolution.**
The entire database schema is bootstrapped by one file: `supabase/migrations/001_init.sql` (`README.md:43-46`). No additional migration files are visible in the directory tree at depth 2. As the schema evolves through Phase 2 and Phase 3, the absence of a migration discipline (numbered, idempotent, reviewed migrations) will make schema changes high-risk and difficult to roll back.

**AI service has no visible authentication layer.**
The AI service entry point is `ai-service/main.py` with routing under `ai-service/routers/`. No authentication middleware or API-key enforcement between the Go API and the AI service is visible in the directory tree. If port 8000 is reachable beyond the Go API in any hosted environment, it represents a direct, unmetered path to Anthropic API consumption (`ai-service/main.py`, `ai-service/routers/`, `ai-service/.env.example`).

---

# Tech-debt register

| # | Item | Location | Severity | Notes |
|---|------|----------|----------|-------|
| TD-01 | Webhook handler has at least one unresolved TODO/FIXME | `api/internal/handlers/webhooks.go` | **Critical** | Payment callback path; Stripe signature verification must be confirmed present before Phase 2 |
| TD-02 | No CI pipeline | *(no CI files found in repo)* | **High** | Zero automated testing, linting, or vulnerability scanning on PRs; three dependency manifests (`ai-service/requirements.txt`, `api/go.mod`, `platform/package.json`) are unaudited |
| TD-03 | Single monolithic database migration | `supabase/migrations/001_init.sql` (`README.md:43-46`) | **High** | No incremental migration strategy; schema changes in Phase 2/3 will be risky without a numbered-migration discipline |
| TD-04 | No inter-service authentication | `ai-service/main.py`, `ai-service/routers/` | **High** | Go API → AI service call is over plain HTTP with no visible mutual auth; AI service port exposure is uncontrolled |
| TD-05 | No Vercel / deployment configuration committed | `platform/next.config.ts`, `README.md:53` | Medium | Phase 2 targets Vercel auto-deploy but no `vercel.json` or equivalent artefact is present; deploy behaviour is undocumented and unreviewed |
| TD-06 | Platform frontend has no `.env.example` | `platform/` directory | Medium | Secret injection path for the Next.js app is undocumented; risk of secrets being bundled into client-side build artefacts via `next.config.ts` |
| TD-07 | Database RLS posture unknown | `supabase/migrations/001_init.sql` | Medium | Supabase RLS capability exists but whether row-level security policies are defined in the migration cannot be determined from the directory tree; multi-tenant order/payment data requires RLS before Phase 2 |
| TD-08 | No lock-file for Python dependencies | `ai-service/requirements.txt` | Low | `platform/package-lock.json` exists for Node (`platform/package-lock.json`) but the Python service has only `requirements.txt` with no `pip freeze`-style lock; reproducibility and vulnerability surface are uncontrolled |
| TD-09 | Agent hooks introduced in a single batch with no incremental testing record | `.claude/hooks/` (all 9 files, 1 touch each) | Low | All protective hooks landed together; no evidence of individual hook testing or failure-mode documentation |
| TD-10 | OpenAPI spec change management process undefined | `openspec/changes/`, `openspec/config.yaml` | Low | Change sets directory exists but no tooling or CI step validates the spec against the Go API implementation |

---

# Recent incidents (last 90d)

No incident records, post-mortems, or operational runbooks are present in the repository at the depth read. The `docs/` directory contains `docs/TRIAGE_FRAMEWORK.md` and `docs/TRIAGE_REPORT.md` (`docs/TRIAGE_FRAMEWORK.md`, `docs/TRIAGE_REPORT.md`), which indicate a triage process exists, but the content of those files is not available in the provided repo readings and cannot be cited.

The commit history provided contains a single merge commit within the observable window:

- `7aa53d8` — *Merge pull request #5 from sagacioussid02/minions/eng/audit-and-apply-patch-minor-updates-to-t-63d41cb8* (`7aa53d8`)

The high-churn file list shows all 15 files with exactly 1 touch each, all appearing to be part of the same foundational scaffolding batch (`.claude/hooks/`, `.claude/settings.json`, `.gitignore`, `CLAUDE.md`, `CONTRIBUTING.md`). This pattern is consistent with an initial agent-tooling setup commit rather than incident-driven changes.

**Conclusion:** No incidents can be confirmed or cited from the available repo readings. The triage documentation in `docs/TRIAGE_REPORT.md` should be reviewed directly by the operator to determine whether any incidents have been recorded outside the commit history.

---

# Open questions for operator

1. **Webhook handler completeness** — `api/internal/handlers/webhooks.go` contains at least one TODO/FIXME. What is the current state of Stripe webhook signature verification in this handler? Is it safe to accept live payment callbacks, or must this be resolved before Phase 2 activation?

2. **CI pipeline decision** — No CI configuration exists in the repository. Is there an external CI system (e.g., GitHub Actions, CircleCI) configured at the repository settings level that is simply not committed, or is CI genuinely absent? If absent, what is the operator's timeline and appetite for introducing automated testing and vulnerability scanning before Phase 2?

3. **Database RLS policies** — The schema is initialised by `supabase/migrations/001_init.sql` (`README.md:43-46`). Are Supabase Row Level Security policies defined in that migration for order and payment tables? If not, is multi-tenant data isolation a requirement before Phase 2 launch?

4. **AI service authentication** — The AI service (`ai-service/main.py`, `ai-service/routers/`) has no visible authentication layer between it and the Go API. In the Phase 2 hosted environment, will port 8000 be network-isolated (e.g., private VPC, internal DNS only), or does it require an application-level API key to prevent unauthorised Anthropic API consumption?

5. **Vercel deployment configuration** — Phase 2 targets Vercel auto-deploy (`README.md:53`) but no `vercel.json` or equivalent artefact is committed. Has a Vercel project been provisioned? What environment variables are configured there, and has the operator reviewed the build output to confirm no secrets are bundled into client-side Next.js artefacts (`platform/next.config.ts`)?

6. **Triage report findings** — `docs/TRIAGE_REPORT.md` exists in the repository but its content is not available in the current repo readings. Does this report contain open incidents, known bugs, or deferred work items that should be incorporated into the tech-debt register or sprint backlog?

7. **Migration strategy going forward** — With only `supabase/migrations/001_init.sql` committed (`README.md:43-46`), what is the operator's intended process for schema changes in Phase 2 and Phase 3? Is there a decision on a migration tool (e.g., `supabase migrate`, `golang-migrate`, `dbmate`) or will changes continue to be applied manually via the Supabase SQL editor?

8. **Template deployment ownership** — Six templates exist under `templates/` (e.g., `templates/event-app/`, `templates/trip-game/`). In Phase 2, when the Go API triggers a Vercel auto-deploy per order, who owns the Vercel account, billing, and per-deployment cost? Is there a cost model and cap in place before live orders are accepted?

9. **Branch protection server-side enforcement** — The agent-side hooks (`.claude/hooks/protect-git-push.sh`, `.claude/hooks/auto-draft-pr.sh`) enforce the PR workflow for agent commits. Has the operator enabled GitHub branch protection rules on `main` to enforce the same constraints for human contributors and any CI merge steps?

10. **Phase 0 / Phase 1 status** — The README describes Phase 0 (waitlist) and Phase 1 (manual MVP) as precursors to Phase 2 automation (`README.md:49-52`). Has Phase 0 demand validation been completed? Is Phase 1 currently live with real orders, and if so, what manual operational procedures are in place that the automated Phase 2 system must replicate or supersede?
