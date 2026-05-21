---
generated_at: 2026-05-20T19:24:38.728109+00:00
commit_sha: 96e014319f0582e9594a950f9bc48cdd0a677926
crew: discoverer/v1
sections_present: [architecture, data, infra, security, hot_spots, tech_debt, incidents, questions]
---

# Architecture

AaaG ("Apps As A Gift") is a marketplace for personalized micro-apps built as a three-tier, polyglot microservices system. The services and their roles are declared in the project README (`README.md:9-14`):

| Layer | Service | Technology | Port |
|---|---|---|---|
| Frontend | `platform/` | Next.js 14 (TypeScript) | 3000 |
| Backend API | `api/` | Go + Gin | 8080 |
| AI Service | `ai-service/` | Python FastAPI | 8000 |
| Database | `supabase/` | PostgreSQL (Supabase) | — |
| Templates | `templates/` | Next.js (per template) | — |

## Platform (Next.js 14)

The frontend is a Next.js 14 application (`platform/next.config.ts`) written in TypeScript. It serves the landing page, the app-configuration wizard, and the customer dashboard (`README.md:10`). Dependencies are managed via npm (`platform/package-lock.json`, `platform/package.json`). ESLint is configured at `platform/eslint.config.mjs` and PostCSS at `platform/postcss.config.mjs`. Application source lives under `platform/app/` and shared utilities under `platform/lib/`. Public static assets are in `platform/public/` and build/utility scripts in `platform/scripts/`.

## Go API

The backend API is a Go service using the Gin framework (`README.md:11`). The module root is declared at `api/go.mod`. The entry point is `api/cmd/` (invoked via `go run ./cmd/server`, `README.md:32`). Business logic is organized under `api/internal/`, which contains at minimum a `handlers/` package — the webhook handler (`api/internal/handlers/webhooks.go`) is the only file flagged with a TODO/FIXME. The API is responsible for orders, payments, and app lifecycle management (`README.md:11`).

## AI Service

The AI service is a Python FastAPI application (`README.md:12`) launched with Uvicorn on port 8000 (`README.md:22`). The entry point is `ai-service/main.py`. Route definitions live under `ai-service/routers/` and core logic under `ai-service/core/`. Dependencies are pinned in `ai-service/requirements.txt`. The service is Claude-powered (Anthropic API key required, referenced as `ANTHROPIC_API_KEY` in `ai-service/.env.example`) and is responsible for content generation for personalized micro-apps.

## Database

PostgreSQL is provided by Supabase (`README.md:13`). Schema initialization is performed by running `supabase/migrations/001_init.sql` in the Supabase SQL editor (`README.md:37-38`). All migrations are stored under `supabase/migrations/`.

## Templates

Pre-built micro-app templates are stored as independent Next.js applications under `templates/` (`README.md:14`). The directory tree (`Directory tree:depth-2`) shows six template categories: `event-app/`, `personal-diary/`, `portfolio-website/`, `recipe-app/`, `travel-planner/`, and `trip-game/`. Each template is a deployable unit that the platform instantiates and customizes per order.

## Build Phases

The system is designed for incremental delivery (`README.md:41-45`):
- **Phase 0** — Landing page + waitlist
- **Phase 1** — Manual MVP (Google Form → hand-deployed → Stripe payment link)
- **Phase 2** — Automation (Go API + AI service + Vercel auto-deploy)
- **Phase 3** — Full platform (dashboard, 4 templates, ProductHunt launch)

## Agent / Automation Layer

A `.claude/` directory contains hooks for CI-adjacent automation (`Directory tree:depth-2`): `audit-log.sh`, `auto-draft-pr.sh`, `cost-tracker.sh`, `notify-email.sh`, `protect-destructive.sh`, `protect-env.sh`, `protect-git-push.sh`, `protect-prod.sh`, and `security-scan.sh`. Agent skills are stored under `.agents/skills/` and `.claude/skills/`, including a `neon-postgres` skill (`skills-lock.json`).

---

# Data model & flows

## Database Schema

The canonical schema is established by a single migration file: `supabase/migrations/001_init.sql` (`README.md:37-38`). No further migration files are visible in the directory tree, making this the sole source of truth for the current data model. The detailed column-level schema cannot be cited without reading the file contents directly, but the migration is the authoritative DDL for all tables.

## Configuration / Environment Contracts

Each service declares its required environment variables via `.env.example` files:

- **AI Service**: `ai-service/.env.example` — includes at minimum `ANTHROPIC_API_KEY` (`README.md:21`)
- **Go API**: `api/.env.example` — described as requiring "all keys" (`README.md:27`)
- **Platform**: `platform/` does not expose a `.env.example` in the directory tree

These files define the inter-service configuration surface without exposing secret values.

## Request / Data Flow

Based on the service responsibilities declared in `README.md:9-14` and the build phase descriptions (`README.md:41-45`), the primary data flow is:

1. **Customer → Platform (port 3000)**: The user interacts with the Next.js wizard to configure a personalized micro-app and initiates payment.
2. **Platform → Go API (port 8080)**: The platform submits the order and payment intent to the Go API, which owns order lifecycle, payment processing, and app provisioning state.
3. **Go API → AI Service (port 8000)**: The Go API delegates content generation to the FastAPI AI service, which calls the Anthropic Claude API to produce personalized content for the selected template.
4. **Go API → Supabase (PostgreSQL)**: Order records, app state, and user data are persisted to the Supabase-hosted PostgreSQL database (`README.md:13`).
5. **Go API → Template deployment**: In Phase 2+, the Go API triggers automated deployment of a template instance (e.g., via Vercel) (`README.md:44`).
6. **Stripe Webhooks → Go API**: Payment events from Stripe are received by the webhook handler at `api/internal/handlers/webhooks.go`, which contains at least one outstanding TODO (`api/internal/handlers/webhooks.go:1`).

## Template Data Flow

Templates under `templates/` (`Directory tree:depth-2`) — `event-app/`, `personal-diary/`, `portfolio-website/`, `recipe-app/`, `travel-planner/`, `trip-game/` — are the deployable artifacts. The AI service generates content that is injected into a selected template, and the Go API manages the resulting app's lifecycle (`README.md:11,14`).

## OpenAPI / Contract Layer

An `openspec/` directory exists at the repo root with a `config.yaml` and a `changes/` subdirectory (`Directory tree:depth-2`). This indicates that inter-service API contracts are tracked via an OpenAPI specification, providing a formal schema for the Platform ↔ API and API ↔ AI Service communication boundaries.

# Infra & deploy topology

## Service Inventory

AaaG is a polyglot, three-tier microservices system composed of four runtime services and a shared database layer. The canonical service table is declared in `README.md:9-14`:

| Service | Technology | Bound Port | Role |
|---|---|---|---|
| `platform/` | Next.js 14 (TypeScript) | 3000 | Landing page, wizard, dashboard |
| `api/` | Go + Gin | 8080 | Orders, payments, app lifecycle |
| `ai-service/` | Python FastAPI | 8000 | Claude-powered content generation |
| `supabase/` | PostgreSQL (Supabase-hosted) | — | DB schema + migrations |
| `templates/` | Next.js (per template) | — | Deployable micro-app units |

## Platform (Next.js 14)

The frontend is a Next.js 14 TypeScript application rooted at `platform/` (`platform/next.config.ts`). It is started with `npm run dev` and binds to port 3000 (`README.md:35`). Application source lives under `platform/app/`, shared utilities under `platform/lib/`, static assets under `platform/public/`, and build/utility scripts under `platform/scripts/`. ESLint is configured at `platform/eslint.config.mjs` and PostCSS at `platform/postcss.config.mjs`. Dependencies are managed via npm and locked in `platform/package-lock.json` (`platform/package.json`).

## Go API

The backend API is a Go + Gin service (`README.md:11`) whose module root is declared at `api/go.mod`. The server entry point is `api/cmd/` and is launched via `go run ./cmd/server` (`README.md:30-32`), binding to port 8080 (`README.md:11`). Business logic is organized under `api/internal/`, which contains at minimum a `handlers/` package. The Stripe webhook handler resides at `api/internal/handlers/webhooks.go` and carries at least one outstanding TODO (`api/internal/handlers/webhooks.go:1`). Required environment variables are declared in `api/.env.example`, described as requiring "all keys" (`README.md:27`).

## AI Service

The AI service is a Python FastAPI application (`README.md:12`) launched with Uvicorn on port 8000 (`README.md:22`). The entry point is `ai-service/main.py`, route definitions live under `ai-service/routers/`, and core logic under `ai-service/core/`. Python dependencies are pinned in `ai-service/requirements.txt`. The service requires an Anthropic API key, referenced as `ANTHROPIC_API_KEY` in `ai-service/.env.example` (`README.md:21`).

## Database

PostgreSQL is provided as a managed Supabase instance (`README.md:13`). Schema initialization is performed by executing `supabase/migrations/001_init.sql` directly in the Supabase SQL editor (`README.md:37-38`). All migrations are stored under `supabase/migrations/`. There is no self-hosted database container; the project depends on the external Supabase cloud service.

## Templates

Six pre-built micro-app templates are stored as independent deployable Next.js applications under `templates/`: `event-app/`, `personal-diary/`, `portfolio-website/`, `recipe-app/`, `travel-planner/`, and `trip-game/` (`README.md:14`). Each template is a standalone unit that the platform instantiates and customizes per customer order.

## Deployment Topology & Phases

The system is designed for incremental delivery across four phases (`README.md:41-45`):

- **Phase 0** — Static landing page + waitlist only
- **Phase 1** — Manual MVP: Google Form intake → hand-deployed template → Stripe payment link (no automation)
- **Phase 2** — Automated pipeline: Go API + AI service active; Vercel auto-deploy of template instances triggered by the API (`README.md:44`)
- **Phase 3** — Full platform: dashboard live, four templates available, ProductHunt launch

In Phase 2+, the intended deployment target for template instances is **Vercel** (`README.md:44`). The `platform/` Next.js frontend is also a natural Vercel deployment candidate given the framework choice, though no CI/CD pipeline files are present in the repository at this commit.

## Inter-Service Communication

Based on service port bindings declared in `README.md:9-14`, the runtime call graph is:

1. **Browser → Platform (`:3000`)**: Customer configures a micro-app via the Next.js wizard.
2. **Platform → Go API (`:8080`)**: Order submission and payment initiation.
3. **Go API → AI Service (`:8000`)**: Content generation requests delegated to FastAPI/Claude.
4. **Go API → Supabase (PostgreSQL)**: Order records, app state, and user data persisted to the managed Supabase database (`README.md:13`).
5. **Stripe → Go API (`:8080`)**: Inbound payment webhooks handled at `api/internal/handlers/webhooks.go`.
6. **Go API → Vercel (Phase 2+)**: Automated template deployment triggered by the API (`README.md:44`).

Inter-service API contracts are tracked via an OpenAPI specification in `openspec/config.yaml` with a `openspec/changes/` subdirectory for versioned diffs.

## Environment & Secret Surface

Each service declares its required environment variables via `.env.example` files:

- **AI Service**: `ai-service/.env.example` — includes at minimum `ANTHROPIC_API_KEY` (`README.md:21`)
- **Go API**: `api/.env.example` — requires all integration keys (Stripe, Supabase, etc.) (`README.md:27`)

No `.env.example` is present for the `platform/` frontend in the visible directory tree.

## Automation & Guard Hooks

A `.claude/hooks/` directory contains shell-based CI-adjacent automation scripts: `audit-log.sh`, `auto-draft-pr.sh`, `cost-tracker.sh`, `notify-email.sh`, `protect-destructive.sh`, `protect-env.sh`, `protect-git-push.sh`, `protect-prod.sh`, and `security-scan.sh`. Agent skills — including a `neon-postgres` skill — are stored under `.agents/skills/` and `.claude/skills/`, with versions locked in `skills-lock.json`. No formal CI pipeline configuration files (e.g., GitHub Actions workflows) are present in the repository at commit `96e0143`.

# Security posture

## Summary

AaaG is an early-stage, polyglot microservices project (Next.js 14 frontend, Go + Gin API, Python FastAPI AI service, Supabase PostgreSQL). The project has a meaningful set of agent-layer guard hooks but lacks formal CI/CD pipelines, has at least one unresolved TODO in a payment-critical handler, and exposes a broad secret surface across three services. The overall posture is **nascent**: protective intent is visible in the hook layer, but enforcement gaps are significant.

---

## 1. Secret & Credential Management

**Positive:** All three services use `.env.example` files to declare required secrets by name without inlining values. The AI service declares `ANTHROPIC_API_KEY` in `ai-service/.env.example` (`README.md:21`); the Go API declares all integration keys (Stripe, Supabase, etc.) in `api/.env.example` (`README.md:27`).

**Gap:** No `.env.example` is present for the `platform/` frontend in the visible directory tree. If the Next.js frontend requires any server-side secrets (e.g., Supabase anon key, Stripe publishable key), there is no documented contract for what those are or how they should be supplied.

**Gap:** The `.gitignore` exists (`README.md` and `.gitignore` are both listed in high-churn files), but without reading its contents it cannot be confirmed that `.env` files are excluded from version control. The presence of `.env.example` files in `ai-service/` and `api/` is necessary but not sufficient — the corresponding `.env` files must also be gitignored.

**Hook coverage:** A dedicated `protect-env.sh` hook exists in `.claude/hooks/` (`.claude/hooks/protect-env.sh`), indicating intent to block accidental secret exposure at the agent/automation layer. However, this hook is not a substitute for CI-enforced secret scanning.

---

## 2. CI/CD Pipeline & Automated Security Gates

**Critical gap:** No CI pipeline configuration files are present in the repository at commit `96e014319f0582e9594a950f9bc48cdd0a677926`. The repo readings explicitly state: *"CI files: (none found)"*. This means:

- No automated dependency vulnerability scanning (no `npm audit`, `go mod audit`, or `pip-audit` in CI).
- No static analysis or SAST tooling running on pull requests.
- No automated secret scanning (e.g., `gitleaks`, `truffleHog`) on commits.
- No container image scanning.

The `.claude/hooks/security-scan.sh` (`.claude/hooks/security-scan.sh`) provides a partial mitigation at the agent automation layer, but it is not a CI gate and does not enforce the same guarantees.

---

## 3. Dependency Surface & Supply Chain

**AI Service:** Python dependencies are pinned in `ai-service/requirements.txt`. The pinning strategy (exact versions vs. ranges) cannot be confirmed without reading the file, but the file's existence is a prerequisite for reproducible builds and vulnerability scanning.

**Go API:** Go module dependencies are declared in `api/go.mod` and locked in `api/go.sum`. The `go.sum` file provides cryptographic integrity verification of the full dependency graph — this is a Go-native supply-chain control.

**Platform:** npm dependencies are declared in `platform/package.json` and locked in `platform/package-lock.json`. The lock file ensures reproducible installs. No `npm audit` gate is visible in CI (see §2).

**Risk:** Without CI-enforced dependency scanning, known CVEs in any of these three dependency trees will not be surfaced automatically.

---

## 4. Payment Webhook Handler (High-Risk TODO)

The Stripe webhook handler at `api/internal/handlers/webhooks.go` is the only file in the repository flagged with an outstanding TODO/FIXME (`api/internal/handlers/webhooks.go:1`). This is a **high-risk finding**: webhook handlers for payment processors must implement:

- **Signature verification** — validating the `Stripe-Signature` header against the webhook signing secret to prevent spoofed payment events.
- **Idempotency** — ensuring duplicate event delivery does not cause double-fulfillment.
- **Event type allowlisting** — rejecting unexpected event types.

An unresolved TODO in this specific file raises the concern that one or more of these controls may be incomplete or missing. This should be treated as a priority security review item.

---

## 5. Inter-Service Authentication & Network Trust

The runtime call graph (Browser → Platform `:3000` → Go API `:8080` → AI Service `:8000` → Supabase) is declared in `README.md:9-14`. No inter-service authentication mechanism (e.g., shared secrets, mTLS, JWT service tokens) is documented in the visible repo surface.

**Gap:** The AI service (`ai-service/main.py`, `ai-service/routers/`) binds on port 8000. If it is reachable beyond the Go API (i.e., not network-isolated), any caller can invoke Claude-powered content generation without authentication, incurring both cost and data-exposure risk.

**Gap:** The Go API (`api/cmd/`, `api/internal/`) handles Stripe webhooks and order lifecycle. Without confirmed signature verification (see §4), the payment flow is potentially spoofable.

---

## 6. Agent / Automation Guard Hooks

The `.claude/hooks/` directory contains a layered set of protective shell scripts:

| Hook | Purpose |
|---|---|
| `.claude/hooks/protect-env.sh` | Block accidental secret exposure |
| `.claude/hooks/protect-git-push.sh` | Guard against unauthorized pushes |
| `.claude/hooks/protect-prod.sh` | Protect production environment |
| `.claude/hooks/protect-destructive.sh` | Block destructive operations |
| `.claude/hooks/security-scan.sh` | Agent-layer security scanning |
| `.claude/hooks/audit-log.sh` | Audit trail for agent actions |

These hooks demonstrate security-conscious automation design. However, all hooks were introduced in a single commit (each shows 1 touch in the high-churn list), meaning they have not yet been battle-tested through iterative use. Their effectiveness depends on correct shell implementation, which cannot be verified without reading the files.

---

## 7. Database Security

The database schema is established by a single migration: `supabase/migrations/001_init.sql` (`README.md:37-38`). The project depends on the external Supabase cloud service (`README.md:13`).

**Gap:** Row-Level Security (RLS) policy coverage, table-level permissions, and the use of service-role vs. anon keys cannot be assessed without reading the migration file. In Supabase, RLS must be explicitly enabled per table; the default is permissive. This is a critical control for a multi-tenant marketplace where customer data (orders, personal app content) must be isolated.

---

## 8. OpenAPI Contract Coverage

An `openspec/config.yaml` and `openspec/changes/` directory exist, indicating inter-service API contracts are tracked. Formal API schemas reduce the risk of unvalidated input crossing service boundaries. The completeness of this specification cannot be assessed without reading the files, but its presence is a positive signal.

---

## 9. Missing Platform `.env.example`

The `platform/` directory does not expose a `.env.example` in the directory tree, unlike `ai-service/.env.example` and `api/.env.example`. For a Next.js application that communicates with the Go API and potentially Supabase directly (e.g., via the Supabase JS client), undocumented environment variables increase the risk of misconfiguration and accidental secret exposure in client-side bundles (e.g., variables not prefixed `NEXT_PUBLIC_` being inadvertently exposed).

---

## Priority Findings (Ranked)

| # | Finding | Severity | Citation |
|---|---|---|---|
| 1 | Unresolved TODO in Stripe webhook handler — signature verification likely incomplete | **Critical** | `api/internal/handlers/webhooks.go:1` |
| 2 | No CI pipeline — no automated SAST, dependency scanning, or secret scanning | **High** | *(CI files: none found)* |
| 3 | AI service network exposure — no documented inter-service auth | **High** | `

# Hot spots

**Stripe webhook handler with unresolved TODO.** The single most concentrated risk in the codebase is `api/internal/handlers/webhooks.go`, which is the only file in the repository flagged with an outstanding TODO/FIXME (`api/internal/handlers/webhooks.go:1`). This handler sits on the critical payment path: it receives inbound Stripe events that drive order fulfillment. An incomplete implementation here risks missing signature verification, idempotency guards, or event-type allowlisting — any of which can be exploited or cause double-fulfillment.

**Agent/automation hooks — all introduced in a single commit.** Every hook under `.claude/hooks/` — `audit-log.sh`, `auto-draft-pr.sh`, `cost-tracker.sh`, `notify-email.sh`, `protect-destructive.sh`, `protect-env.sh`, `protect-git-push.sh`, `protect-prod.sh`, and `security-scan.sh` — shows exactly 1 touch in the 90-day churn window. This means the entire guard layer was introduced at once and has not been exercised through iterative use. A single-commit introduction with no follow-up touches is a signal that these hooks have not been validated in practice.

**AI service — unauthenticated inter-service surface.** The AI service entry point is `ai-service/main.py` with routes under `ai-service/routers/`, binding on port 8000 (`README.md:22`). No inter-service authentication mechanism is documented in the visible repo surface. If the service is reachable beyond the Go API, any caller can invoke Claude-powered content generation, incurring both cost overrun and data-exposure risk.

**Single database migration with no subsequent schema evolution.** The entire data model is established by one file: `supabase/migrations/001_init.sql` (`README.md:37-38`). No additional migration files are visible in `supabase/migrations/`. For a marketplace handling orders, payments, and multi-tenant customer data, the absence of any subsequent migrations suggests either the schema has never been iterated on (pre-MVP) or migrations are being applied outside version control — both are risk signals.
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
