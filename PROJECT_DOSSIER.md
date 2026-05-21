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

---

# Tech-debt register

| ID | Description | Location | Severity |
|----|-------------|----------|----------|
| TD-01 | **Unresolved TODO in payment webhook handler.** The Stripe webhook handler carries at least one outstanding TODO, raising concern that signature verification, idempotency, or event-type allowlisting may be incomplete. | `api/internal/handlers/webhooks.go:1` | Critical |
| TD-02 | **No CI pipeline.** The repo contains zero CI configuration files (GitHub Actions, CircleCI, etc.). There are no automated gates for SAST, dependency vulnerability scanning (`npm audit`, `pip-audit`, `govulncheck`), or secret scanning on pull requests. The repo readings explicitly confirm: *"CI files: (none found)."* | *(repo-wide)* | High |
| TD-03 | **Missing `platform/` `.env.example`.** Both `ai-service/.env.example` (`README.md:21`) and `api/.env.example` (`README.md:27`) document their secret contracts. The `platform/` directory has no equivalent in the visible directory tree, leaving Next.js server-side and client-side environment variable requirements undocumented and increasing the risk of secrets leaking into client bundles. | `platform/` | High |
| TD-04 | **Manual database migration workflow.** Schema initialization requires manually running `supabase/migrations/001_init.sql` in the Supabase SQL editor (`README.md:37-38`). There is no automated migration runner (e.g., `supabase db push`, Flyway, or similar) visible in the repo, making schema drift across environments likely as the project evolves. | `supabase/migrations/` | Medium |
| TD-05 | **OpenAPI spec completeness unknown.** An `openspec/config.yaml` and `openspec/changes/` directory exist, indicating inter-service contract tracking is intended. However, the completeness of coverage across the Platform ↔ API and API ↔ AI Service boundaries cannot be confirmed from the visible tree alone, and no CI gate enforces spec conformance. | `openspec/config.yaml`, `openspec/changes/` | Medium |
| TD-06 | **Templates lack documented deployment contract.** Six template directories exist (`templates/event-app/`, `templates/personal-diary/`, `templates/portfolio-website/`, `templates/recipe-app/`, `templates/travel-planner/`, `templates/trip-game/`) but the mechanism by which the Go API triggers their deployment (described as Vercel auto-deploy in Phase 2, `README.md:44`) is not implemented or documented in the visible repo at this commit. | `templates/`, `README.md:44` | Medium |
| TD-07 | **Agent hooks unvalidated in practice.** All `.claude/hooks/` scripts show exactly 1 touch each in the 90-day window, meaning they were introduced in a single batch and have not been exercised iteratively. Their correctness as security gates is unverified. | `.claude/hooks/` | Low |

---

# Recent incidents (last 90d)

No production incidents, postmortems, or incident reports are recorded in the repository at commit `96e014319f0582e9594a950f9bc48cdd0a677926`. The `docs/` directory contains `ARCHITECTURE.md`, `TRIAGE_FRAMEWORK.md`, and `TRIAGE_REPORT.md` (`Directory tree:depth-2`), but no incident log or runbook is visible in the directory tree. The recent commit history shows a single merge commit (`96e0143 Merge pull request #3 from sagacioussid02/minions/eng/sprint-proposal-for-aaag-ca73ff01`) with no references to hotfixes, rollbacks, or incident-driven changes. The high-churn file list covers only the initial scaffolding layer (hooks, skills, config files — each with 1 touch), consistent with a project that has not yet reached a state where production incidents can occur.

*No cited incidents can be reported; the project appears pre-production at this commit.*

---

# Open questions for operator

1. **Stripe webhook signature verification** — The TODO at `api/internal/handlers/webhooks.go:1` is in the payment-critical path. Has Stripe webhook signature verification (`Stripe-Signature` header validation) been implemented? If not, this must be resolved before any live payment traffic is accepted. What is the target completion date?

2. **CI/CD pipeline decision** — No CI configuration exists in the repository. What is the intended CI provider (GitHub Actions, CircleCI, etc.), and who is responsible for standing it up? Until CI exists, there are no automated gates for security scanning, dependency audits, or test execution on pull requests.

3. **AI service network isolation** — Is the FastAPI AI service (`ai-service/main.py`, port 8000, `README.md:22`) intended to be publicly reachable, or should it be network-isolated and callable only by the Go API? If the latter, what network boundary (VPC, internal DNS, API gateway) will enforce this, and is it in scope for the current sprint?

4. **Supabase Row-Level Security posture** — The schema is established by `supabase/migrations/001_init.sql` (`README.md:37-38`). Has RLS been enabled on all tables containing customer or order data? In Supabase, the default is permissive; explicit RLS policies are required for multi-tenant data isolation. Can the operator confirm RLS coverage before Phase 2 goes live?

5. **Platform environment variable contract** — `api/.env.example` and `ai-service/.env.example` document their secret requirements (`README.md:21,27`), but no equivalent exists for `platform/`. What environment variables does the Next.js frontend require (Supabase anon key, Stripe publishable key, API base URL, etc.), and should a `platform/.env.example` be added to the repo?

6. **Migration strategy beyond `001_init.sql`** — The current workflow requires manually running `supabase/migrations/001_init.sql` in the Supabase SQL editor (`README.md:37-38`). As the schema evolves, how will migrations be applied across local, staging, and production environments? Is `supabase db push` or a similar automated runner planned?

7. **Template deployment mechanism for Phase 2** — `README.md:44` describes Vercel auto-deploy of template instances as the Phase 2 automation target, but no implementation is visible in `templates/` or `api/internal/`. What is the intended Vercel deployment API integration point, and is this scoped to the current sprint or deferred?

8. **`docs/TRIAGE_REPORT.md` contents** — A triage report exists at `docs/TRIAGE_REPORT.md` (`Directory tree:depth-2`). Does this report contain any open action items or risk findings that should be tracked in this register? The operator should confirm whether its contents are superseded by or additive to this dossier.
