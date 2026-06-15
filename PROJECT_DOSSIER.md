---
generated_at: 2026-06-14T11:01:58.695915+00:00
commit_sha: 2c5df6b967bcec5123b00dd5cf4133673971241d
crew: discoverer/v1
sections_present: [architecture, data, infra, security, hot_spots, tech_debt, incidents, questions]
---

# Architecture

AaaG ("Apps As A Gift") is a multi-service marketplace platform composed of four distinct runtime services and a shared database layer.

## Service Topology

| Service | Runtime | Port | Role |
|---------|---------|------|------|
| `platform/` | Next.js 14 (TypeScript) | 3000 | Frontend: landing page, wizard UI, dashboard |
| `api/` | Go + Gin | 8080 | Backend: orders, payments, app lifecycle |
| `ai-service/` | Python FastAPI | 8000 | AI content generation via Claude |
| `supabase/` | PostgreSQL | — | Persistent data store |

(`README.md:9-14`)

## Platform (Next.js)

The frontend is a Next.js 14 application written in TypeScript (`platform/package.json`). It is configured with `next.config.ts` (`platform/next.config.ts`) and uses PostCSS (`platform/postcss.config.mjs`) and ESLint (`platform/eslint.config.mjs`). Application source lives under `platform/app/` and shared utilities under `platform/lib/`. End-to-end tests are co-located in `platform/e2e/` and driven by Playwright (`platform/playwright.config.ts`). Utility scripts reside in `platform/scripts/`.

## Go API

The API service is a Go module (`api/go.mod`) using the Gin HTTP framework. The entry point is `api/cmd/server/main.go`, which carries three open TODOs (`api/cmd/server/main.go:3 TODOs`). Business-logic handlers are split between `api/handlers/` (e.g., `api/handlers/wizard.go`) and `api/internal/handlers/` (e.g., `api/internal/handlers/webhooks.go`). Domain logic for orders lives in `api/internal/orders/orders.go`. The wizard handler has one open TODO (`api/handlers/wizard.go:1 TODO`); the webhook handler has one open TODO (`api/internal/handlers/webhooks.go:1 TODO`); the orders module has one open TODO (`api/internal/orders/orders.go:1 TODO`).

## AI Service

The AI service is a Python FastAPI application (`ai-service/main.py`) that wraps Claude-powered content generation. Dependencies are declared in `ai-service/requirements.txt`. Routing logic is organised under `ai-service/routers/` and shared domain code under `ai-service/core/`. Guard behaviour is tested in `ai-service/test_guards.py`. The service expects `ANTHROPIC_API_KEY` to be supplied via environment (referenced in `ai-service/.env.example`).

## Database

PostgreSQL is provided by Supabase. The schema is initialised via a single migration file at `supabase/migrations/` (referenced in `README.md:38-40`).

## Templates

Pre-built micro-app templates are stored as independent Next.js applications under `templates/`, with six variants: `event-app`, `personal-diary`, `portfolio-website`, `recipe-app`, `travel-planner`, and `trip-game` (`templates/`).

## OpenAPI / Contract

An API contract layer exists under `openspec/`, with a top-level `openspec/config.yaml` and incremental change sets under `openspec/changes/`.

## Automation & Hooks

Agent automation hooks live in `.claude/hooks/` and include: audit logging (`audit-log.sh`), PR auto-drafting (`auto-draft-pr.sh`), cost tracking (`cost-tracker.sh`), email notification (`notify-email.sh`), and several protection guards (`protect-destructive.sh`, `protect-env.sh`, `protect-git-push.sh`, `protect-prod.sh`, `security-scan.sh`). Agent skill definitions are stored in `.agents/skills/` and `.claude/skills/`.

## Build Phases

The system is designed for incremental delivery (`README.md:29-35`):
- **Phase 0** — Static landing page + waitlist
- **Phase 1** — Manual MVP (Google Form → hand-deployed → Stripe payment link)
- **Phase 2** — Automated pipeline (Go API + AI service + Vercel auto-deploy)
- **Phase 3** — Full platform (dashboard, four templates, ProductHunt launch)

---

# Data model & flows

## Database Layer

All persistent state is stored in PostgreSQL via Supabase. The schema is defined and versioned through migration files located in `supabase/migrations/`. The initial schema is applied by running the migration in the Supabase SQL editor (`README.md:38-40`).

## Order Lifecycle

Order domain logic is encapsulated in `api/internal/orders/orders.go`. The Go API exposes order-related endpoints through `api/handlers/wizard.go` (wizard submission flow) and processes asynchronous payment/lifecycle events through `api/internal/handlers/webhooks.go`. An open TODO in `api/internal/orders/orders.go` indicates at least one incomplete data-handling path in the order module.

## Wizard Flow

The user-facing wizard is served by the Next.js platform (`platform/app/`) and submits data to the Go API's wizard handler (`api/handlers/wizard.go`). The wizard handler has one unresolved TODO (`api/handlers/wizard.go:1 TODO`), indicating a pending step in the wizard-to-order data flow.

## Webhook / Payment Flow

Inbound webhook events (e.g., Stripe payment confirmations) are received and processed by `api/internal/handlers/webhooks.go`. One open TODO remains in this handler (`api/internal/handlers/webhooks.go:1 TODO`), suggesting an incomplete branch in the payment-confirmation-to-order-update path.

## AI Content Generation Flow

When a personalised micro-app is requested, the Go API delegates content generation to the AI service. The AI service (`ai-service/main.py`) exposes FastAPI routes defined under `ai-service/routers/`, uses shared domain logic from `ai-service/core/`, and calls the Anthropic Claude API using `ANTHROPIC_API_KEY` (`ai-service/.env.example`). Generated content is returned to the Go API for storage and downstream template rendering.

## Template Rendering

Personalised content is injected into one of the pre-built template applications under `templates/` (e.g., `templates/event-app/`, `templates/personal-diary/`). Each template is a standalone Next.js application that receives the generated data and is deployed independently (Phase 2 target: Vercel auto-deploy, `README.md:33`).

## Environment / Secret Bindings

- The AI service requires `ANTHROPIC_API_KEY` (`ai-service/.env.example`).
- The Go API requires additional keys (payment provider, Supabase credentials) declared in `api/.env.example`.
- Secrets are never inlined; they are referenced by name through `.env` files excluded from version control (`.gitignore`).

## Integration Test Coverage

- AI service guard behaviour is tested in `ai-service/test_guards.py`.
- A broader integration test suite for the AI service exists at `tests/test_ai_service.py`.
- End-to-end platform flows are covered by Playwright tests in `platform/e2e/` (`platform/playwright.config.ts`).

# Infra & deploy topology

## Service Topology

AaaG is composed of four distinct runtime services and a shared database layer, each running on a separate port (`README.md:9-14`):

| Service | Runtime | Port | Role |
|---------|---------|------|------|
| `platform/` | Next.js 14 (TypeScript) | 3000 | Frontend: landing page, wizard UI, dashboard |
| `api/` | Go + Gin | 8080 | Backend: orders, payments, app lifecycle |
| `ai-service/` | Python FastAPI | 8000 | AI content generation via Claude |
| `supabase/` | PostgreSQL | — | Persistent data store |

There is no container orchestration manifest (Dockerfile, docker-compose, Kubernetes YAML, or Terraform) present in the repository readings. No CI pipeline files were found.

---

## Platform — Next.js Frontend

The frontend is a Next.js 14 TypeScript application (`platform/package.json`). Its Next.js configuration is declared in `platform/next.config.ts`. PostCSS is configured via `platform/postcss.config.mjs` and linting via `platform/eslint.config.mjs`. Application source lives under `platform/app/`, shared utilities under `platform/lib/`, and static assets under `platform/public/`. Utility scripts reside in `platform/scripts/`.

The platform is started locally with `npm run dev` (`README.md:50-52`). The Phase 2 target deployment target for the platform and templates is Vercel auto-deploy (`README.md:33`).

End-to-end tests are co-located in `platform/e2e/` and driven by Playwright (`platform/playwright.config.ts`).

---

## Go API — Backend Service

The API service is a Go module (`api/go.mod`) using the Gin HTTP framework, listening on port 8080 (`README.md:11`). The entry point is `api/cmd/server/main.go`, which carries three open TODOs. Business-logic handlers are split between `api/handlers/` (e.g., `api/handlers/wizard.go`) and `api/internal/handlers/` (e.g., `api/internal/handlers/webhooks.go`). Domain logic for orders lives in `api/internal/orders/orders.go`.

The service is started locally with `go run ./cmd/server` (`README.md:44-47`). Environment secrets (payment provider keys, Supabase credentials) are supplied via `api/.env.example`-derived `.env` file, excluded from version control.

---

## AI Service — Python FastAPI

The AI service is a Python FastAPI application (`ai-service/main.py`) listening on port 8000 (`README.md:12`). Dependencies are declared in `ai-service/requirements.txt`. Routing logic is organised under `ai-service/routers/` and shared domain code under `ai-service/core/`.

The service is started locally with `uvicorn main:app --reload --port 8000` (`README.md:38-41`). It requires `ANTHROPIC_API_KEY` supplied via environment, referenced by name in `ai-service/.env.example`. Guard behaviour is tested in `ai-service/test_guards.py`; a broader integration test suite exists at `tests/test_ai_service.py`.

---

## Database — Supabase / PostgreSQL

Persistent state is stored in PostgreSQL provided by Supabase (`README.md:13`). The schema is initialised via migration files under `supabase/migrations/`. The initial migration is applied by running it in the Supabase SQL editor (`README.md:55-57`). No self-hosted database container configuration is present in the repository.

---

## Templates — Micro-App Deployments

Pre-built micro-app templates are stored as independent Next.js applications under `templates/`, with six variants: `templates/event-app/`, `templates/personal-diary/`, `templates/portfolio-website/`, `templates/recipe-app/`, `templates/travel-planner/`, and `templates/trip-game/`. Each template is a standalone application intended for independent deployment (Phase 2 target: Vercel auto-deploy, `README.md:33`).

---

## OpenAPI Contract

An API contract layer exists under `openspec/`, with a top-level configuration at `openspec/config.yaml` and incremental change sets under `openspec/changes/`.

---

## Automation & Local Hooks

Agent automation hooks live in `.claude/hooks/` and include: audit logging (`audit-log.sh`), PR auto-drafting (`auto-draft-pr.sh`), cost tracking (`cost-tracker.sh`), email notification (`notify-email.sh`), and protection guards (`protect-destructive.sh`, `protect-env.sh`, `protect-git-push.sh`, `protect-prod.sh`, `security-scan.sh`). These are local developer/agent-side hooks; no server-side CI pipeline configuration was found in the repository readings.

---

## Deployment Phases

The system is designed for incremental delivery (`README.md:29-35`):

- **Phase 0** — Static landing page + waitlist (validate before building)
- **Phase 1** — Manual MVP: Google Form → hand-deployed → Stripe payment link
- **Phase 2** — Automated pipeline: Go API + AI service + Vercel auto-deploy
- **Phase 3** — Full platform: dashboard, four templates, ProductHunt launch

No cloud provider credentials, infrastructure-as-code files, or deployment pipeline definitions are present in the current repository snapshot.

# Security posture

## Summary

AaaG is an early-stage, multi-service marketplace (Next.js frontend, Go/Gin API, Python FastAPI AI service, Supabase/PostgreSQL). The project has meaningful security scaffolding in its agent-automation layer but exhibits several significant gaps in runtime security controls, CI/CD hardening, and incomplete implementation paths that carry direct security implications.

---

## Positive Controls

### Secret Management
Secrets are never inlined in source code. Both the AI service and Go API declare their required secrets by name only in example files (`ai-service/.env.example`, `api/.env.example`), and `.env` files are excluded from version control (`.gitignore`). The `ANTHROPIC_API_KEY` is referenced by name, not value (`ai-service/.env.example`).

### Agent-Layer Protection Hooks
A suite of local protection hooks exists under `.claude/hooks/` that provides meaningful defence-in-depth for agent-driven operations:

- **Environment file protection**: `.claude/hooks/protect-env.sh` — guards against accidental `.env` reads or writes.
- **Destructive-operation guard**: `.claude/hooks/protect-destructive.sh` — intercepts destructive commands.
- **Git push protection**: `.claude/hooks/protect-git-push.sh` — prevents direct pushes to protected branches.
- **Production guard**: `.claude/hooks/protect-prod.sh` — blocks unreviewed production changes.
- **Security scan hook**: `.claude/hooks/security-scan.sh` — runs a security scan as part of the agent workflow.
- **Audit logging**: `.claude/hooks/audit-log.sh` — records agent actions for traceability.

### AI Service Guard Testing
Guard behaviour for the AI service is explicitly tested in `ai-service/test_guards.py`, and a broader integration test suite exists at `tests/test_ai_service.py`. This indicates some intentional effort to validate safety boundaries around the Claude-powered content generation path.

### End-to-End Test Coverage
Platform flows are covered by Playwright end-to-end tests co-located in `platform/e2e/` and driven by `platform/playwright.config.ts`, providing some regression coverage for user-facing security-relevant flows (e.g., wizard submission).

---

## Risks and Gaps

### 1. No CI/CD Pipeline
**No CI pipeline files were found in the repository.** There is no automated security scanning, dependency vulnerability checking, linting, or test execution on pull requests. The `.claude/hooks/security-scan.sh` hook is a local/agent-side control only — it does not run on every commit or PR server-side. This means:
- Dependency vulnerabilities can be merged without detection.
- The open TODOs in security-sensitive handlers (see below) are not blocked by any automated gate.

### 2. Incomplete Security-Sensitive Code Paths (Open TODOs)
Multiple open TODOs exist in handlers that process payment and order data — the most security-sensitive flows in the application:

- `api/cmd/server/main.go` carries **3 open TODOs** (`api/cmd/server/main.go`). Incomplete server initialisation can mean missing middleware (authentication, rate limiting, CORS, request validation).
- `api/handlers/wizard.go` has **1 open TODO** (`api/handlers/wizard.go`) in the wizard submission handler — the entry point for user-supplied data into the order pipeline.
- `api/internal/handlers/webhooks.go` has **1 open TODO** (`api/internal/handlers/webhooks.go`) in the webhook/payment handler. Incomplete webhook verification logic is a critical risk: unverified Stripe webhooks can be spoofed to trigger fraudulent order state transitions.
- `api/internal/orders/orders.go` has **1 open TODO** (`api/internal/orders/orders.go`) in the order domain logic, indicating an incomplete data-handling path.

These TODOs in payment and order flows represent **high-severity incomplete security controls** until resolved and reviewed.

### 3. No Container or Infrastructure Hardening
No Dockerfile, docker-compose, Kubernetes manifests, or Terraform files are present in the repository. Services are documented as running on localhost ports (`README.md:9-14`): platform on 3000, Go API on 8080, AI service on 8000. Without container or network-level controls, there is no documented network segmentation, no least-privilege service accounts, and no resource limits. The AI service is started with `--reload` in the documented quickstart (`README.md:38-41`), which is a development-only flag that must not reach production.

### 4. No Documented Authentication or Authorisation Model
The repository readings contain no evidence of an authentication middleware, JWT validation, API key verification, or role-based access control layer in the Go API (`api/handlers/`, `api/internal/handlers/`). The OpenAPI contract exists (`openspec/config.yaml`) but no security scheme definitions are visible in the readings. The wizard and webhook handlers process sensitive data without any cited auth controls.

### 5. Webhook Signature Verification Unconfirmed
The Stripe webhook handler at `api/internal/handlers/webhooks.go` has an open TODO (`api/internal/handlers/webhooks.go`). Webhook signature verification (validating the `Stripe-Signature` header against a shared secret) is a mandatory control to prevent spoofed payment events. Its presence cannot be confirmed from the available readings, and the open TODO raises concern that it may be absent or incomplete.

### 6. Six Independent Template Applications — Unaudited Attack Surface
Six standalone Next.js template applications exist under `templates/` (`templates/event-app/`, `templates/personal-diary/`, `templates/portfolio-website/`, `templates/recipe-app/`, `templates/travel-planner/`, `templates/trip-game/`). Each is an independent application with its own dependency tree. No dependency audit files, lock files, or security configurations are cited for any of these templates in the repository readings, representing an unaudited and potentially vulnerable attack surface.

### 7. Dependency Audit Coverage Unclear
While `docs/DEPENDENCY_AUDIT.md` exists, the repository readings do not confirm its currency or scope. The three primary dependency manifests are `ai-service/requirements.txt`, `api/go.mod`, and `platform/package.json`. Without CI-enforced scanning (see gap 1), the audit document may not reflect the current state of all six template applications or the three core services.

---

## Risk Summary Table

| Risk | Severity | Location |
|------|----------|----------|
| No CI pipeline — no automated security gates | High | Repository-wide |
| Incomplete webhook handler (payment spoofing risk) | High | `api/internal/handlers/webhooks.go` |
| Incomplete server init (missing middleware risk) | High | `api/cmd/server/main.go` |
| No documented auth/authz layer | High | `api/handlers/`, `api/internal/handlers/` |
| Incomplete wizard handler (input validation risk) | Medium | `api/handlers/wizard.go` |
| Incomplete order logic | Medium | `api/internal/orders/orders.go` |
| `--reload` flag in documented quickstart | Medium | `README.md:38-41` |
| Six unaudited template dependency trees | Medium | `templates/` |
| No infra hardening / network segmentation | Medium | Repository-wide |

# Hot spots

The following files concentrate the highest density of incomplete implementation markers and represent the most active risk areas in the codebase.

**`api/cmd/server/main.go`** is the single most concerning file in the repository, carrying **3 open TODOs** (`api/cmd/server/main.go`). As the Go API entry point, any incomplete initialisation here propagates risk across every downstream handler — missing middleware registration (authentication, rate limiting, CORS, request-body validation) would affect the entire service surface.

**`api/internal/handlers/webhooks.go`** carries **1 open TODO** (`api/internal/handlers/webhooks.go`) inside the payment webhook handler. This is the highest-severity individual TODO in the codebase: an incomplete Stripe webhook handler can mean absent or partial signature verification, which would allow spoofed payment events to trigger fraudulent order state transitions.

**`api/handlers/wizard.go`** carries **1 open TODO** (`api/handlers/wizard.go`). This handler is the entry point for all user-supplied data entering the order pipeline from the Next.js wizard UI. Incomplete input validation or incomplete handoff to the order domain represents a data-integrity and injection-risk hot spot.

**`api/internal/orders/orders.go`** carries **1 open TODO** (`api/internal/orders/orders.go`), indicating at least one incomplete branch in the core order domain logic — the data model that all payment and lifecycle events ultimately mutate.

Taken together, all four TODO-bearing files sit on the same critical path: wizard submission → order creation → payment webhook → order state update. A gap in any one of them can corrupt the entire transaction flow.

The **six independent template applications** under `templates/` (`templates/event-app/`, `templates/personal-diary/`, `templates/portfolio-website/`, `templates/recipe-app/`, `templates/travel-planner/`, `templates/trip-game/`) each carry an independent, unaudited dependency tree. No lock files or dependency audit artefacts are cited for any of these templates in the repository readings, making them a diffuse but real attack-surface hot spot as the platform scales toward Phase 3.

---

# Tech-debt register

| ID | Description | Location | Severity |
|----|-------------|----------|----------|
| TD-001 | **3 unresolved TODOs in server entry point.** Incomplete server initialisation risks missing middleware (auth, rate-limit, CORS, body validation) for the entire Go API. | `api/cmd/server/main.go` | High |
| TD-002 | **Incomplete webhook handler.** 1 open TODO in the Stripe/payment webhook handler; webhook signature verification cannot be confirmed as implemented. | `api/internal/handlers/webhooks.go` | High |
| TD-003 | **No CI/CD pipeline.** No CI configuration files were found in the repository. There are no automated gates for tests, linting, dependency scanning, or security checks on PRs. The `.claude/hooks/security-scan.sh` hook is agent-local only and does not substitute for server-side CI. | Repository-wide (no CI file found) | High |
| TD-004 | **No documented authentication or authorisation layer.** No auth middleware, JWT validation, API-key verification, or RBAC is cited anywhere in `api/handlers/` or `api/internal/handlers/`. The OpenAPI contract exists at `openspec/config.yaml` but no security scheme is confirmed in the readings. | `api/handlers/`, `api/internal/handlers/` | High |
| TD-005 | **Incomplete wizard handler.** 1 open TODO in the wizard submission handler — the primary ingestion point for user-supplied data. | `api/handlers/wizard.go` | Medium |
| TD-006 | **Incomplete order domain logic.** 1 open TODO in the order module indicates an unfinished data-handling path. | `api/internal/orders/orders.go` | Medium |
| TD-007 | **Development `--reload` flag in documented quickstart.** The AI service quickstart documents `uvicorn main:app --reload --port 8000` (`README.md`). The `--reload` flag must not reach a production deployment; there is no production start command documented. | `README.md` | Medium |
| TD-008 | **Six unaudited template dependency trees.** Each template under `templates/` is a standalone Next.js application with its own dependency graph. No lock files, audit reports, or security configurations are cited for any of them. | `templates/event-app/`, `templates/personal-diary/`, `templates/portfolio-website/`, `templates/recipe-app/`, `templates/travel-planner/`, `templates/trip-game/` | Medium |
| TD-009 | **No container or infrastructure hardening.** No Dockerfile, docker-compose, Kubernetes manifests, or Terraform files are present. Services are documented as running on bare localhost ports (`README.md`). No network segmentation, least-privilege service accounts, or resource limits are defined. | Repository-wide | Medium |
| TD-010 | **Single migration file for entire schema.** The database schema is initialised via a single migration applied manually in the Supabase SQL editor (`README.md`). There is no automated migration runner, rollback strategy, or schema versioning beyond the initial file under `supabase/migrations/`. | `supabase/migrations/` | Low–Medium |
| TD-011 | **Handler split between `api/handlers/` and `api/internal/handlers/`.** Business logic is fragmented across two handler directories without a clear documented boundary, increasing cognitive overhead and the risk of inconsistent middleware application. | `api/handlers/`, `api/internal/handlers/` | Low |
| TD-012 | **`docs/DEPENDENCY_AUDIT.md` currency unconfirmed.** The audit document exists but without CI enforcement there is no guarantee it reflects the current state of all three primary manifests (`ai-service/requirements.txt`, `api/go.mod`, `platform/package.json`) or the six template applications. | `docs/DEPENDENCY_AUDIT.md` | Low |

---

# Recent incidents (last 90d)

The repository's commit history provides only a single commit in the available readings:

> `2c5df6b` — *Merge pull request #19 from sagacioussid02/minions/eng/triage-and-resolve-the-single-open-todo--4c7d0f2f*

This merge commit (`2c5df6b`) is the most recent recorded event. It references a triage-and-resolve action targeting "the single open TODO," which corresponds to work tracked in `docs/ISSUES.md` and `docs/TRIAGE_REPORT.md`. The branch name pattern (`minions/eng/triage-and-resolve-the-single-open-todo`) indicates this was an agent-driven remediation effort.

**No production incidents, outage post-mortems, or security events are recorded in the available repository readings.** The high-churn file list shows all touched files received exactly 1 touch each, and all are infrastructure/configuration files (`.claude/hooks/`, `.claude/settings.json`, `.gitignore`, `CLAUDE.md`, `CONTRIBUTING.md`) rather than application source — consistent with a project in early bootstrapping rather than one with an operational incident history.

Given the absence of a CI pipeline and the presence of multiple open TODOs in payment-critical handlers (`api/cmd/server/main.go`, `api/internal/handlers/webhooks.go`), **no live payment processing has been confirmed as operational**, which means no payment-related incidents are expected in this window. The project appears to be in Phase 1–2 transition per the build phases described in `README.md`.

---

# Open questions for operator

1. **Which TODOs in `api/cmd/server/main.go` are blocking vs. deferred?** The entry point carries 3 open TODOs (`api/cmd/server/main.go`). Before any payment flow goes live, the operator should confirm whether authentication middleware, rate limiting, and CORS are implemented or intentionally deferred — and if deferred, what compensating controls exist.

2. **Has Stripe webhook signature verification been implemented?** The webhook handler at `api/internal/handlers/webhooks.go` has an open TODO. Can the operator confirm whether `Stripe-Signature` header validation is present? If not, this must be treated as a P0 security gap before any real payment events are processed.

3. **What is the intended authentication and authorisation model?** No auth layer is cited anywhere in the Go API handlers. Is the API currently public? Is Supabase Row-Level Security the intended auth boundary, or is a middleware layer planned? This needs a decision before Phase 2 automation goes live.

4. **Is there a plan to introduce CI/CD?** No CI pipeline files exist in the repository. Given the open TODOs in security-sensitive handlers, the operator should decide: (a) which CI provider to adopt, (b) what gates are required (tests, `govulncheck`, `pip-audit`, ESLint, Playwright), and (c) whether a Decision Record should be raised to formalise this.

5. **What is the production start command for the AI service?** The documented quickstart uses `uvicorn main:app --reload --port 8000` (`README.md`), which is development-only. What is the intended production invocation (worker count, no `--reload`, TLS termination)?

6. **Are the six template applications in scope for dependency auditing and security patching?** Each template under `templates/` is an independent Next.js application with its own dependency tree. Is the operator treating these as first-class services requiring audit, or as vendored/frozen artefacts? The answer determines whether `docs/DEPENDENCY_AUDIT.md` needs to cover them.

7. **What is the database migration strategy beyond the initial file?** The schema is currently initialised via a single migration applied manually in the Supabase SQL editor (`README.md`). As the schema evolves, does the operator intend to adopt a migration runner (e.g., `supabase db push`, Flyway, or Atlas), and is there a rollback strategy?

8. **What is the intended boundary between `api/handlers/` and `api/internal/handlers/`?** Handlers are split across two directories without a documented boundary. Should all new handlers go into `api/internal/handlers/`, and should the existing `api/handlers/wizard.go` be migrated? A clear convention will prevent inconsistent middleware application as the API grows.
