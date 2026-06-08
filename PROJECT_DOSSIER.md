---
generated_at: 2026-05-31T10:42:25.836024+00:00
commit_sha: 9ad58542db9b2c82425f6596f8adcd0e5eb9b60e
crew: discoverer/v1
sections_present: [architecture, data, infra, security, hot_spots, tech_debt, incidents, questions]
---

# Architecture

AaaG ("Apps As A Gift") is a marketplace for personalized micro-apps built as a three-tier, polyglot service mesh. The four runtime services and their responsibilities are declared in the project README (`README.md:8-13`):

| Layer | Service | Technology | Port |
|-------|---------|-----------|------|
| Frontend | `platform/` | Next.js 14 (TypeScript) | 3000 |
| Backend API | `api/` | Go + Gin | 8080 |
| AI Generation | `ai-service/` | Python FastAPI | 8000 |
| Persistence | `supabase/` | PostgreSQL (Supabase) | — |

## Platform (Next.js 14)

The frontend is a Next.js 14 application (`platform/next.config.ts`) with TypeScript, ESLint (`platform/eslint.config.mjs`), PostCSS (`platform/postcss.config.mjs`), and Playwright for end-to-end tests (`platform/playwright.config.ts`). Application source lives under `platform/app/` and shared utilities under `platform/lib/`. Static assets are served from `platform/public/`. Deployment scripts are in `platform/scripts/`. Key dependencies are declared in `platform/package.json`.

The platform serves three user-facing surfaces:
- **Landing page** — marketing and waitlist capture
- **Wizard** — no-code app configuration flow (the most recently shipped feature, per commit `9ad5854`)
- **Dashboard** — order and app lifecycle management

## Go API

The Go API is a Gin-based HTTP server (`api/go.mod`) that owns orders, payments, and app lifecycle. Entry point is `api/cmd/` and all domain logic lives under `api/internal/`. The only file flagged with outstanding TODOs is the webhook handler (`api/internal/handlers/webhooks.go:1`), indicating Stripe or similar payment-provider webhook processing is partially implemented.

## AI Service

The AI service is a FastAPI application (`ai-service/main.py`) that wraps Anthropic's Claude API for content generation. Routers are organized under `ai-service/routers/` and shared logic under `ai-service/core/`. Runtime dependencies are pinned in `ai-service/requirements.txt`. The service requires `ANTHROPIC_API_KEY` (referenced by name in `ai-service/.env.example`).

## Templates

Pre-built micro-app templates are standalone Next.js applications under `templates/` (`README.md:13`). Six templates are present at depth-2: `event-app/`, `personal-diary/`, `portfolio-website/`, `recipe-app/`, `travel-planner/`, and `trip-game/`. These are the deployable artifacts produced when a customer order is fulfilled.

## OpenAPI / Contract Layer

An API contract layer lives under `openspec/` with a central config (`openspec/config.yaml`) and a `changes/` directory for versioned diff tracking, providing a machine-readable contract between the platform and the Go API.

## Deployment Model

The platform targets Vercel auto-deploy (Phase 2 onwards, per `README.md:30`). The Go API and AI service are independently deployable processes. Database migrations are applied manually to a Supabase-hosted PostgreSQL instance (`README.md:35-37`). The full technical plan, user flow, pricing model, and build phases are documented in `docs/ARCHITECTURE.md`.

## Agent / Automation Layer

Claude Code hooks under `.claude/hooks/` enforce guardrails at commit time: audit logging (`audit-log.sh`), cost tracking (`cost-tracker.sh`), destructive-operation protection (`protect-destructive.sh`), env-file protection (`protect-env.sh`), git-push branch protection (`protect-git-push.sh`), production protection (`protect-prod.sh`), security scanning (`security-scan.sh`), and automated PR drafting (`auto-draft-pr.sh`). Agent skills are stored in `.agents/skills/` and `.claude/skills/`, including a Neon-Postgres skill (`skills-lock.json`).

---

# Data model & flows

## Persistence: Supabase PostgreSQL

All persistent state is stored in a Supabase-hosted PostgreSQL instance. The schema is version-controlled as SQL migrations under `supabase/migrations/` (`README.md:35-37`). The bootstrap migration is `supabase/migrations/001_init.sql`. No additional migration files are visible at depth-2, indicating the schema is in early/single-migration state.

## Environment-Scoped Secrets

Each service declares its required environment variables via `.env.example` files:
- `ai-service/.env.example` — holds `ANTHROPIC_API_KEY` and AI-service config
- `api/.env.example` — holds database connection strings, Stripe keys, and other API secrets

Secrets are never inlined; they are referenced by name only.

## Primary Data Flows

### 1. Order Creation Flow (Platform → API → Database)

```
User (Browser)
  │  POST wizard form
  ▼
platform/ (Next.js, :3000)
  │  HTTP POST /orders
  ▼
api/ (Go/Gin, :8080)
  │  Validates request, writes order record
  ▼
supabase/ (PostgreSQL)
```

The wizard UI (`platform/app/`) collects personalization inputs and submits them to the Go API. The API persists an order record to Supabase.

### 2. AI Content Generation Flow (API → AI Service → Templates)

```
api/ (Go/Gin, :8080)
  │  HTTP POST to ai-service
  ▼
ai-service/ (FastAPI, :8000)
  │  Calls Anthropic Claude API with prompt
  ▼
Claude API (external)
  │  Returns generated content
  ▼
ai-service/ routers/
  │  Returns structured content payload
  ▼
api/ — merges content into template
  ▼
templates/<template-name>/ — personalized micro-app artifact
```

The AI service exposes domain-specific routers (`ai-service/routers/`) that translate order parameters into Claude prompts. Generated content is returned to the Go API, which hydrates the appropriate template (`templates/event-app/`, `templates/portfolio-website/`, etc.) to produce the customer's micro-app.

### 3. Payment Webhook Flow (Stripe → API)

```
Stripe (external)
  │  POST /webhooks
  ▼
api/internal/handlers/webhooks.go
  │  Verifies signature, updates order status
  ▼
supabase/ (PostgreSQL)
```

Stripe (or equivalent payment provider) delivers webhook events to the Go API. The handler at `api/internal/handlers/webhooks.go` processes these events; this file carries an outstanding TODO (`api/internal/handlers/webhooks.go:1`), indicating the implementation is not yet complete.

### 4. App Lifecycle / Deployment Flow

```
api/ — triggers Vercel deploy (Phase 2+)
  │
  ▼
Vercel — deploys personalized Next.js template
  │
  ▼
Customer receives live URL
```

Per the build roadmap (`README.md:28-33`), Phase 2 automates deployment via the Go API calling Vercel's deploy API. In Phase 1 (manual MVP), deployment is performed by hand after payment confirmation.

## OpenAPI Contract

The `openspec/` directory (`openspec/config.yaml`, `openspec/changes/`) maintains a versioned API contract between the platform frontend and the Go API backend, ensuring that data shapes exchanged over HTTP are formally specified and change-tracked.

# Infra & deploy topology

## Service Mesh Overview

AaaG is a three-tier, polyglot service mesh composed of four runtime services running on distinct ports (`README.md:8-13`):

| Layer | Service | Technology | Port |
|-------|---------|-----------|------|
| Frontend | `platform/` | Next.js 14 (TypeScript) | 3000 |
| Backend API | `api/` | Go + Gin | 8080 |
| AI Generation | `ai-service/` | Python FastAPI | 8000 |
| Persistence | `supabase/` | PostgreSQL (Supabase) | — |

All four services are independently deployable processes with no shared runtime process boundary.

## Platform (Next.js 14 — Port 3000)

The frontend is a Next.js 14 application configured at `platform/next.config.ts`. It uses TypeScript, ESLint (`platform/eslint.config.mjs`), PostCSS (`platform/postcss.config.mjs`), and Playwright for end-to-end tests (`platform/playwright.config.ts`). Application source lives under `platform/app/`, shared utilities under `platform/lib/`, static assets under `platform/public/`, and deployment scripts under `platform/scripts/`. Runtime dependencies are declared in `platform/package.json`.

**Deployment target:** Vercel auto-deploy, activated in Phase 2 of the build roadmap (`README.md:30`). In Phase 1 (manual MVP), the platform is deployed by hand (`README.md:28-33`).

**Local start:**
```bash
cd platform && npm install && npm run dev
```
(`README.md:22-24`)

## Go API (Gin — Port 8080)

The Go API is a Gin-based HTTP server whose module root is declared in `api/go.mod`. The entry point is `api/cmd/` and all domain logic (orders, payments, app lifecycle) lives under `api/internal/`. The webhook handler at `api/internal/handlers/webhooks.go` carries an outstanding TODO (`api/internal/handlers/webhooks.go:1`), indicating Stripe or equivalent payment-provider webhook processing is partially implemented.

**Local start:**
```bash
cd api && go mod tidy && go run ./cmd/server
```
(`README.md:17-20`)

**Secrets:** Required environment variables are declared by name in `api/.env.example` (database connection strings, Stripe keys, and other API secrets). Secrets are never inlined.

## AI Service (FastAPI — Port 8000)

The AI service is a FastAPI application with its entry point at `ai-service/main.py`. Domain-specific routers are organized under `ai-service/routers/` and shared logic under `ai-service/core/`. Runtime dependencies are pinned in `ai-service/requirements.txt`.

**Local start:**
```bash
cd ai-service && uvicorn main:app --reload --port 8000
```
(`README.md:14-16`)

**Secrets:** Requires `ANTHROPIC_API_KEY`, declared by name in `ai-service/.env.example`. The service proxies all generation requests to Anthropic's Claude API (external dependency).

## Persistence (Supabase PostgreSQL)

All persistent state is stored in a Supabase-hosted PostgreSQL instance (`README.md:35-37`). The schema is version-controlled as SQL migrations under `supabase/migrations/`. The bootstrap migration is `supabase/migrations/001_init.sql`. No additional migration files are visible at depth-2, indicating the schema is in early/single-migration state.

**Provisioning:** A Supabase project must be created at supabase.com and the bootstrap migration applied manually via the SQL editor (`README.md:35-37`). There is no automated migration runner or CI-driven schema deployment present in the repository.

## Templates (Deployable Artifacts)

Pre-built micro-app templates are standalone Next.js applications under `templates/` (`README.md:13`). Six templates exist at depth-2:

- `templates/event-app/`
- `templates/personal-diary/`
- `templates/portfolio-website/`
- `templates/recipe-app/`
- `templates/travel-planner/`
- `templates/trip-game/`

These are the deployable artifacts produced when a customer order is fulfilled. In Phase 2+, the Go API triggers a Vercel deploy of the hydrated template, delivering a live URL to the customer (`README.md:30`).

## API Contract Layer

A versioned API contract layer lives under `openspec/` with a central config at `openspec/config.yaml` and a `openspec/changes/` directory for diff tracking. This provides a machine-readable contract between the platform frontend and the Go API backend.

## CI / CD Pipeline

**No CI configuration files were found in the repository.** There is no `.github/workflows/`, `Dockerfile`, `docker-compose.yml`, or equivalent infrastructure-as-code present at the scanned depth. The deployment model is currently:

1. **Phase 1 (current/manual):** Developer deploys each service by hand after payment confirmation (`README.md:28-29`).
2. **Phase 2 (planned):** Go API calls Vercel's deploy API to automate template deployment (`README.md:30`).

## Agent / Automation Guardrails

Claude Code hooks under `.claude/hooks/` enforce commit-time guardrails relevant to infra operations:

- **`audit-log.sh`** — records all agent actions to an audit log
- **`cost-tracker.sh`** — tracks API/compute cost per operation
- **`protect-destructive.sh`** — blocks destructive filesystem operations
- **`protect-env.sh`** — prevents reads of `.env` files and secret material
- **`protect-git-push.sh`** — enforces branch protection (no direct pushes to `main`/`master`)
- **`protect-prod.sh`** — blocks production-environment mutations without approval
- **`security-scan.sh`** — scans commits for secret leakage
- **`auto-draft-pr.sh`** — automatically opens a PR after each agent commit

Agent skills are stored in `.agents/skills/` and `.claude/skills/`, including a Neon-Postgres skill registered in `skills-lock.json`, suggesting a potential future migration path from Supabase to Neon-hosted PostgreSQL.

## Network Topology Summary

```
Browser
  │
  ▼ :3000
platform/ (Next.js — Vercel)
  │  HTTP → :8080
  ▼
api/ (Go/Gin — standalone process)
  ├── HTTP → :8000 ──► ai-service/ (FastAPI — standalone process)
  │                         │
  │                         └── HTTPS ──► Anthropic Claude API (external)
  ├── TCP ──────────────────────────────► Supabase PostgreSQL (external, managed)
  └── HTTPS ─────────────────────────────► Vercel Deploy API (external, Phase 2+)
                                           Stripe Webhooks (external, inbound)
```

All inter-service communication is HTTP/HTTPS. No service mesh, sidecar proxy, or message queue infrastructure is present in the repository at this commit (`9ad5854`).

# Security posture

## Summary

AaaG is an early-stage, multi-service marketplace (Next.js 14 platform, Go/Gin API, Python FastAPI AI service, Supabase PostgreSQL) at commit `9ad5854`. The project has meaningful agent-layer guardrails in place but exhibits several significant gaps in production-grade security controls, particularly around CI/CD, webhook integrity, and network boundary enforcement.

---

## Secrets Management

**Positive:** Secrets are never inlined in source. Each service declares required environment variables by name only via `.env.example` files (`ai-service/.env.example`, `api/.env.example`). The `ANTHROPIC_API_KEY` is referenced by name only (`ai-service/.env.example`); Stripe keys and database connection strings are similarly name-referenced (`api/.env.example`).

**Positive:** A dedicated hook enforces this at commit time: `.claude/hooks/protect-env.sh` blocks reads of `.env` files and secret material during agent operations. A companion `.claude/hooks/security-scan.sh` scans commits for secret leakage.

**Gap:** No evidence of a secrets manager (e.g., Vault, AWS Secrets Manager, Doppler) or runtime secret injection mechanism is present in the repository. The `.env.example` pattern relies entirely on developer discipline for production secret hygiene.

---

## Webhook Integrity (High Risk)

**Critical gap:** The Stripe (or equivalent payment-provider) webhook handler at `api/internal/handlers/webhooks.go` carries an outstanding TODO (`api/internal/handlers/webhooks.go:1`). This is the only file in the repository flagged with a TODO/FIXME. An incomplete webhook handler is a high-severity risk: if signature verification is not fully implemented, the payment flow is vulnerable to spoofed webhook events that could trigger order fulfillment without actual payment.

**Recommendation:** This file must be treated as a security-critical path. Stripe webhook signature verification (`Stripe-Signature` header + shared secret) must be confirmed complete before any payment processing goes live.

---

## CI/CD and Automated Security Gates

**Critical gap:** No CI configuration files were found in the repository — no `.github/workflows/`, `Dockerfile`, `docker-compose.yml`, or equivalent (`CI files: (none found)`). This means:

- No automated dependency vulnerability scanning (e.g., `govulncheck` for Go, `pip-audit` for Python, `npm audit` for Node)
- No SAST (static analysis) pipeline
- No automated secret-scanning in CI (only the agent-layer hook `security-scan.sh` runs, which is scoped to agent commits, not all developer commits)
- No container image scanning

The absence of CI is the single largest structural security gap in the project.

---

## Agent-Layer Guardrails (Positive)

The `.claude/hooks/` directory contains a meaningful set of commit-time controls (`CLAUDE.md`, `.claude/settings.json`):

| Hook | Purpose |
|------|---------|
| `.claude/hooks/audit-log.sh` | Records all agent actions to an audit log |
| `.claude/hooks/cost-tracker.sh` | Tracks API/compute cost per operation |
| `.claude/hooks/protect-destructive.sh` | Blocks destructive filesystem operations |
| `.claude/hooks/protect-env.sh` | Prevents reads of `.env` files and secret material |
| `.claude/hooks/protect-git-push.sh` | Enforces branch protection (no direct pushes to `main`/`master`) |
| `.claude/hooks/protect-prod.sh` | Blocks production-environment mutations without approval |
| `.claude/hooks/security-scan.sh` | Scans commits for secret leakage |
| `.claude/hooks/auto-draft-pr.sh` | Automatically opens a PR after each agent commit |

These hooks are scoped to agent (Claude Code) operations. They do not substitute for CI-enforced gates on all developer commits.

---

## Branch and Code Review Protection

**Positive:** `.claude/hooks/protect-git-push.sh` enforces that no direct pushes to `main`/`master` occur from agent operations. The `CONTRIBUTING.md` file is present, suggesting documented contribution guidelines exist.

**Gap:** Without CI, there is no automated enforcement of review requirements, test passage, or security checks on human-authored PRs. Branch protection rules on the remote (GitHub) are not verifiable from the repository contents alone.

---

## Dependency Security

**Gap:** No lockfile auditing or vulnerability scanning is automated. The three dependency manifests are:

- `ai-service/requirements.txt` — Python dependencies, no evidence of pinned hashes or `pip-audit` integration
- `api/go.mod` — Go module dependencies with `api/go.sum` for checksum verification (Go's built-in supply-chain control — this is a positive)
- `platform/package.json` — Node.js dependencies with `platform/package-lock.json` present (lockfile exists, positive), but no `npm audit` step in CI

Go's `go.sum` (`api/go.sum`) provides cryptographic integrity for the Go dependency graph, which is the strongest dependency supply-chain control present in the project.

---

## Network Boundary and Service Authentication

**Gap:** No evidence of mutual TLS, API gateway, or inter-service authentication between the platform (`:3000`), Go API (`:8080`), and AI service (`:8000`) is present in the repository. All inter-service communication is plain HTTP in the local/development topology (`README.md:14-24`). In production, the AI service at port 8000 must not be publicly exposed; it should be reachable only from the Go API.

**Gap:** The AI service (`ai-service/main.py`, `ai-service/routers/`) proxies all requests to Anthropic's Claude API. There is no evidence of rate limiting, request validation, or prompt injection defenses in the repository at this commit.

---

## Database Security

**Gap:** The Supabase PostgreSQL schema is applied manually via the SQL editor (`README.md:35-37`). There is no automated migration runner or CI-driven schema deployment. Manual schema application increases the risk of unapplied migrations in production and reduces auditability.

**Gap:** Only one migration file is visible (`supabase/migrations/001_init.sql`), indicating the schema is in early/single-migration state. Row-level security (RLS) policies, which are critical for Supabase-hosted multi-tenant data, cannot be verified from the directory tree alone.

---

## Infrastructure as Code

**Gap:** No `Dockerfile`, `docker-compose.yml`, Terraform, or equivalent infrastructure-as-code is present in the repository. The deployment model is currently manual (Phase 1) with planned Vercel auto-deploy for the platform in Phase 2 (`README.md:28-33`). Without IaC, infrastructure configuration is not auditable, reproducible, or version-controlled.

---

## Template Attack Surface

Six pre-built micro-app templates are deployable artifacts under `templates/` (`templates/event-app/`, `templates/personal-diary/`, `templates/portfolio-website/`, `templates/recipe-app/`, `templates/travel-planner/`, `templates/trip-game/`). These templates are hydrated with AI-generated content and deployed to customers. AI-generated content injected into Next.js templates is a potential XSS vector if output is not properly sanitized before rendering. This risk cannot be fully assessed without reading the template source, but it must be explicitly reviewed.

---

## Risk Register Summary

| Risk | Severity | Evidence |
|------|----------|---------|
| Incomplete webhook signature verification | **Critical** | `api/internal/handlers/webhooks.go:1` (TODO present) |
| No CI pipeline — no automated security gates | **High** | `CI files: (none found)` |
| No inter-service authentication | **High** | Network topology, `README.md:14-24` |
| No automated dependency vulnerability scanning | **High** | `ai-service/requirements.txt`, `platform/package.json` |
| Manual database schema deployment | **Medium** | `README.md:35-37`, `supabase/migrations/` |
| No IaC — infrastructure not auditable | **Medium** | Directory tree (no Dockerfile/Terraform) |
| AI-generated content injection into templates | **Medium** | `templates/` (six template directories) |
| No secrets manager — `.env` discipline only | **Medium** | `

# Hot spots

**Webhook handler (incomplete, security-critical)**
The single most dangerous hot spot in the codebase is `api/internal/handlers/webhooks.go`, which is the only file in the entire repository flagged with an outstanding TODO (`api/internal/handlers/webhooks.go:1`). This file owns Stripe (or equivalent) payment-provider webhook processing. An incomplete implementation here means signature verification may not be enforced, exposing the payment flow to spoofed events that could trigger order fulfillment without actual payment.

**No CI pipeline**
There are zero CI configuration files in the repository (`CI files: (none found)`). Every service — `platform/` (Next.js 14), `api/` (Go/Gin), and `ai-service/` (Python FastAPI) — ships without automated test execution, dependency vulnerability scanning, SAST, or secret-scanning on developer commits. The only automated gates that exist are scoped to agent (Claude Code) operations via `.claude/hooks/` (`security-scan.sh`, `protect-env.sh`, `protect-git-push.sh`), not to all developer commits.

**Single-migration database schema**
Only one migration file is visible under `supabase/migrations/` (`supabase/migrations/001_init.sql`). The schema is in early/single-migration state with no automated migration runner or CI-driven schema deployment (`README.md:35-37`). All schema changes are applied manually via the Supabase SQL editor, making the production schema state unverifiable from the repository.

**AI-generated content injection surface**
Six deployable micro-app templates exist under `templates/` (`templates/event-app/`, `templates/personal-diary/`, `templates/portfolio-website/`, `templates/recipe-app/`, `templates/travel-planner/`, `templates/trip-game/`). These templates are hydrated with Claude-generated content via `ai-service/routers/` and deployed to customers. AI-generated content injected into Next.js templates is a potential XSS vector if output is not sanitized before rendering; this path cannot be fully assessed without template source reads but is structurally present.

---

# Tech-debt register

| ID | Item | Severity | Evidence |
|----|------|----------|---------|
| TD-01 | Incomplete webhook handler — TODO present in payment-critical path | Critical | `api/internal/handlers/webhooks.go:1` |
| TD-02 | No CI pipeline — no automated test, lint, audit, or secret-scan gates on developer commits | High | `CI files: (none found)` |
| TD-03 | No inter-service authentication between platform (`:3000`), Go API (`:8080`), and AI service (`:8000`) — plain HTTP in development topology | High | `README.md:14-24` |
| TD-04 | No automated dependency vulnerability scanning — `pip-audit`, `govulncheck`, and `npm audit` are all absent from any pipeline | High | `ai-service/requirements.txt`, `platform/package.json`, `api/go.mod` |
| TD-05 | No secrets manager — production secret hygiene relies entirely on developer discipline with `.env.example` pattern | Medium | `ai-service/.env.example`, `api/.env.example` |
| TD-06 | Manual database schema deployment — no migration runner, no CI-driven schema apply | Medium | `README.md:35-37`, `supabase/migrations/` |
| TD-07 | No infrastructure-as-code — no `Dockerfile`, `docker-compose.yml`, Terraform, or equivalent; infrastructure is not auditable or reproducible | Medium | Directory tree (no IaC files present at depth-2) |
| TD-08 | AI service prompt injection defenses unverified — no evidence of rate limiting, request validation, or prompt injection mitigations in `ai-service/routers/` or `ai-service/core/` | Medium | `ai-service/routers/`, `ai-service/core/` |
| TD-09 | Neon-Postgres skill registered (`skills-lock.json`, `.agents/skills/neon-postgres/SKILL.md`, `.claude/skills/neon-postgres/SKILL.md`) alongside Supabase as the declared persistence layer — potential dual-database drift or unresolved migration path | Low | `skills-lock.json`, `.agents/skills/neon-postgres/SKILL.md` |
| TD-10 | `openspec/changes/` versioned diff tracking exists but no CI enforcement of contract conformance between platform and Go API | Low | `openspec/config.yaml`, `openspec/changes/` |

---

# Recent incidents (last 90d)

No incident records, post-mortems, or `INCIDENTS.md` files are present in the repository at commit `9ad5854`. The `docs/` directory contains `docs/ARCHITECTURE.md`, `docs/TRIAGE_FRAMEWORK.md`, and `docs/TRIAGE_REPORT.md` — the triage report may contain incident-adjacent information, but its contents are not available in the provided repo readings.

The high-churn file list for the last 90 days shows every touched file has exactly **1 touch** (`1 touches` across all entries), and the most recent commit is a merge of a wizard feature branch (`9ad5854 Merge pull request #10 from sagacioussid02/minions/eng/ship-verified-no-code-wizard-happy-path--529a71c5`). This commit history indicates the project is in early active development with no recorded production incidents — consistent with a pre-launch Phase 1/Phase 2 state (`README.md:28-33`).

**No incidents can be cited from the available repo readings.** If incidents have occurred outside the repository (e.g., in a ticketing system, Slack, or external runbook), they are not reflected here.

---

# Open questions for operator

1. **Webhook handler completeness (blocking for payments):** The TODO at `api/internal/handlers/webhooks.go:1` is the only FIXME in the codebase and sits on the payment-critical path. Is Stripe webhook signature verification fully implemented and tested? Can the operator confirm whether live payment processing is currently enabled or gated?

2. **CI pipeline decision:** There are no CI configuration files in the repository. Is the absence of CI intentional for the current phase, or is a CI setup (GitHub Actions, CircleCI, etc.) planned imminently? Without CI, no automated security gates, test runs, or dependency audits exist for developer commits.

3. **Supabase vs. Neon-Postgres:** A Neon-Postgres skill is registered in `skills-lock.json` and present in both `.agents/skills/neon-postgres/SKILL.md` and `.claude/skills/neon-postgres/SKILL.md`, while the declared persistence layer is Supabase (`README.md:35-37`). Is there a planned or in-progress migration from Supabase to Neon? If so, what is the timeline and migration strategy for the existing schema in `supabase/migrations/`?

4. **Production deployment status:** The build roadmap describes Phase 1 as manual MVP and Phase 2 as automated Vercel deploy (`README.md:28-33`). Which phase is the project currently in? Is any service currently serving live production traffic, and if so, which environment variables and infrastructure are in use?

5. **Row-level security on Supabase:** Multi-tenant data in Supabase requires RLS policies to prevent cross-customer data access. Can the operator confirm whether RLS policies are defined in `supabase/migrations/001_init.sql` or applied out-of-band? This is not verifiable from the directory tree alone.

6. **AI service exposure:** The AI service runs on port 8000. In the production topology, is this service publicly reachable or restricted to internal/VPC access from the Go API only? Publicly exposing the AI service would allow unauthenticated prompt injection and unbounded Anthropic API cost.

7. **Template XSS review:** AI-generated content is injected into six Next.js templates under `templates/`. Has a security review been conducted on how generated content is rendered (raw HTML vs. escaped)? This is a prerequisite before customer-facing deployments go live.

8. **`docs/TRIAGE_REPORT.md` contents:** A triage report exists at `docs/TRIAGE_REPORT.md` but its contents were not available in the repo readings. Does this report document any known issues, incidents, or architectural decisions that should be reflected in this dossier?
