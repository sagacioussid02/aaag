---
generated_at: 2026-06-07T10:48:53.588965+00:00
commit_sha: f5ab55ce3dcb54a9f9875901eee8b8761972fc77
crew: discoverer/v1
sections_present: [architecture, data, infra, security, hot_spots, tech_debt, incidents, questions]
---

# Architecture

AaaG ("Apps As A Gift") is a marketplace for personalized micro-apps built as a polyglot, service-oriented system with four primary runtime components and a shared database layer.

## Service Topology

| Service | Technology | Port | Role |
|---------|-----------|------|------|
| `platform/` | Next.js 14 (TypeScript) | 3000 | Customer-facing UI: landing page, order wizard, dashboard |
| `api/` | Go + Gin | 8080 | Core business logic: orders, payments, app lifecycle |
| `ai-service/` | Python FastAPI | 8000 | Claude-powered content generation |
| `supabase/` | PostgreSQL (managed) | — | Shared relational store + migrations |

Sources: `README.md:7-12`

## Platform (Next.js 14)

The front-end is a Next.js 14 application written in TypeScript (`platform/package.json:1`). It is configured with the App Router and Turbopack via `platform/next.config.ts`. Static assets are served from `platform/public/`. Application source lives under `platform/app/` and shared library code under `platform/lib/`. End-to-end tests are co-located in `platform/e2e/` and driven by Playwright (`platform/playwright.config.ts`). Linting is configured via `platform/eslint.config.mjs` and styles via `platform/postcss.config.mjs`.

## Go API

The API service follows a standard Go project layout (`api/go.mod:1`). The entry point is `api/cmd/server` (`README.md:29`). Business logic is encapsulated under `api/internal/`, which contains at minimum a `handlers/` package — the webhook handler (`api/internal/handlers/webhooks.go`) is the highest-complexity file in the codebase by TODO density (`api/internal/handlers/webhooks.go:1`). The module uses Gin as the HTTP framework (`api/go.mod`).

## AI Service

The AI service is a Python FastAPI application (`ai-service/main.py:1`) that wraps Anthropic's Claude API. Dependencies are declared in `ai-service/requirements.txt`. Route handlers are organized under `ai-service/routers/` and core logic under `ai-service/core/`. The service is launched with `uvicorn` on port 8000 (`README.md:19-23`). The Anthropic API key is injected via environment variable `ANTHROPIC_API_KEY` referenced in `ai-service/.env.example`.

## Templates

Pre-built micro-app templates are standalone Next.js applications stored under `templates/`. Six templates exist at this commit: `event-app`, `personal-diary`, `portfolio-website`, `recipe-app`, `travel-planner`, and `trip-game` (`README.md:12`; directory tree). These are deployed per-order as independent apps.

## Infrastructure & Deployment

The platform targets Vercel for auto-deploy (Phase 2 automation, `README.md:49`). The database is hosted on Supabase (`README.md:33-35`). OpenAPI specification changes are tracked under `openspec/changes/` with configuration at `openspec/config.yaml`. Automation hooks (audit logging, cost tracking, PR drafting, environment and git-push protection) are wired as shell scripts under `.claude/hooks/`.

## Build Phases

The project follows a phased delivery model (`README.md:43-50`):
- **Phase 0** — Landing page + waitlist
- **Phase 1** — Manual MVP (Google Form → hand-deploy → Stripe payment link)
- **Phase 2** — Automation (Go API + AI service + Vercel auto-deploy)
- **Phase 3** — Full platform (dashboard, 4 templates, ProductHunt launch)

---

# Data model & flows

## Database Layer

All persistent state is stored in a Supabase-managed PostgreSQL instance. The schema is version-controlled as SQL migrations under `supabase/migrations/`. The initial schema is applied by running `supabase/migrations/001_init.sql` in the Supabase SQL editor (`README.md:33-35`).

## Order & Payment Flow

1. A customer interacts with the order wizard in the `platform/` Next.js UI (`platform/app/`).
2. The wizard submits an order to the Go API (`api/cmd/server`, port 8080).
3. The Go API persists the order to Supabase and initiates a Stripe payment. Payment webhook callbacks are handled in `api/internal/handlers/webhooks.go`.
4. On successful payment, the Go API triggers the AI service (`ai-service/main.py`, port 8000) to generate personalized content for the ordered micro-app template.
5. The AI service calls Anthropic's Claude API (key: `${ANTHROPIC_API_KEY}`, referenced in `ai-service/.env.example`) and returns generated content to the Go API.
6. The Go API selects the appropriate template from `templates/` and deploys a personalized instance (Phase 2+: via Vercel auto-deploy, `README.md:49`).
7. Order status and deployed app URLs are stored back in Supabase and surfaced to the customer via the platform dashboard (`platform/app/`).

## Inter-Service Communication

- **Platform → API**: HTTP REST (platform calls `api/` on port 8080; `README.md:9`).
- **API → AI Service**: HTTP REST (Go API calls `ai-service/` on port 8000; `README.md:11`).
- **API → Supabase**: PostgreSQL driver (Go API reads/writes the shared DB).
- **Platform → Supabase**: Supabase client SDK (direct DB access for read-heavy dashboard queries, consistent with standard Next.js + Supabase patterns; `platform/lib/`).
- **Stripe → API**: Webhook POST to `api/internal/handlers/webhooks.go` (`api/internal/handlers/webhooks.go:1`).

## AI Service Data Flow

Incoming generation requests are routed through `ai-service/routers/` to handler logic in `ai-service/core/`. The service is stateless — it does not own persistent storage. All inputs and outputs pass through the API layer, which owns the Supabase records (`ai-service/main.py:1`; `ai-service/routers/`; `ai-service/core/`).

## OpenAPI Contract

The API surface is described by an OpenAPI specification managed under `openspec/config.yaml`. Incremental changes to the spec are tracked as discrete change documents in `openspec/changes/`, providing a changelog of API evolution between services.

## Test Coverage

Integration-level tests for the AI service are located in `tests/test_ai_service.py`. End-to-end browser tests for the platform are in `platform/e2e/` and executed via Playwright (`platform/playwright.config.ts`).

# Infra & deploy topology

## Runtime Services

AaaG is a polyglot, service-oriented system with four primary runtime components running on distinct ports and technology stacks (`README.md:7-12`):

| Service | Technology | Port | Role |
|---------|-----------|------|------|
| `platform/` | Next.js 14 (TypeScript) | 3000 | Customer-facing UI: landing page, order wizard, dashboard |
| `api/` | Go + Gin | 8080 | Core business logic: orders, payments, app lifecycle |
| `ai-service/` | Python FastAPI | 8000 | Claude-powered content generation |
| `supabase/` | PostgreSQL (managed) | — | Shared relational store + migrations |

## Platform (Next.js 14)

The front-end is a Next.js 14 TypeScript application configured with the App Router and Turbopack via `platform/next.config.ts`. Application source lives under `platform/app/`, shared library code under `platform/lib/`, and static assets under `platform/public/`. End-to-end tests are co-located in `platform/e2e/` and driven by Playwright (`platform/playwright.config.ts`). Linting is configured via `platform/eslint.config.mjs` and styles via `platform/postcss.config.mjs`. The full dependency manifest is at `platform/package.json`.

## Go API

The API service follows a standard Go project layout with its module definition at `api/go.mod`. The entry point is `api/cmd/server` (`README.md:29`). Business logic is encapsulated under `api/internal/`, which contains at minimum a `handlers/` package. The webhook handler (`api/internal/handlers/webhooks.go`) is the highest-complexity file in the codebase by TODO density (`api/internal/handlers/webhooks.go:1`). The service is launched with `go run ./cmd/server` and listens on port 8080 (`README.md:27-30`).

## AI Service

The AI service is a Python FastAPI application launched via `uvicorn` on port 8000 (`README.md:19-23`). The entry point is `ai-service/main.py`. Route handlers are organized under `ai-service/routers/` and core logic under `ai-service/core/`. Dependencies are declared in `ai-service/requirements.txt`. The Anthropic API key is injected via environment variable `${ANTHROPIC_API_KEY}`, referenced in `ai-service/.env.example`. The service is stateless — it owns no persistent storage; all inputs and outputs pass through the API layer.

## Database Layer

All persistent state is stored in a Supabase-managed PostgreSQL instance. The schema is version-controlled as SQL migrations under `supabase/migrations/`. The initial schema is applied by running `supabase/migrations/001_init.sql` in the Supabase SQL editor (`README.md:33-35`).

## Templates

Six pre-built micro-app templates are stored as standalone applications under `templates/`: `event-app`, `personal-diary`, `portfolio-website`, `recipe-app`, `travel-planner`, and `trip-game` (directory tree). These are deployed per-order as independent app instances.

## Inter-Service Communication

- **Platform → API**: HTTP REST; platform calls `api/` on port 8080 (`README.md:9`).
- **API → AI Service**: HTTP REST; Go API calls `ai-service/` on port 8000 (`README.md:11`).
- **API → Supabase**: PostgreSQL driver; Go API reads/writes the shared database.
- **Platform → Supabase**: Supabase client SDK for direct DB access (read-heavy dashboard queries) via `platform/lib/`.
- **Stripe → API**: Inbound webhook POST handled by `api/internal/handlers/webhooks.go` (`api/internal/handlers/webhooks.go:1`).

## Deployment Targets & Automation

The platform targets **Vercel** for automated deployment of the Next.js front-end and per-order template instances (Phase 2 automation, `README.md:49`). The database is hosted on **Supabase** (`README.md:33-35`). No CI pipeline configuration files were found in the repository at this commit.

Automation hooks are wired as shell scripts under `.claude/hooks/`, covering: audit logging (`.claude/hooks/audit-log.sh`), cost tracking (`.claude/hooks/cost-tracker.sh`), PR auto-drafting (`.claude/hooks/auto-draft-pr.sh`), environment protection (`.claude/hooks/protect-env.sh`), git-push protection (`.claude/hooks/protect-git-push.sh`), production protection (`.claude/hooks/protect-prod.sh`), destructive-operation protection (`.claude/hooks/protect-destructive.sh`), and security scanning (`.claude/hooks/security-scan.sh`).

## OpenAPI Contract

The API surface is described by an OpenAPI specification managed at `openspec/config.yaml`. Incremental changes to the spec are tracked as discrete change documents in `openspec/changes/`, providing a changelog of API evolution between services.

## Build Phases

The project follows a phased delivery model (`README.md:43-50`):
- **Phase 0** — Landing page + waitlist (validate before building)
- **Phase 1** — Manual MVP: Google Form → hand-deploy → Stripe payment link
- **Phase 2** — Automation: Go API + AI service + Vercel auto-deploy
- **Phase 3** — Full platform: dashboard, 4 templates, ProductHunt launch

## Local Development

Each service is started independently (`README.md:17-35`):
- AI Service: `uvicorn main:app --reload --port 8000` from `ai-service/`
- Go API: `go run ./cmd/server` from `api/`
- Platform: `npm run dev` from `platform/`
- Database: Supabase project creation + manual migration execution via the Supabase SQL editor

# Security posture

## Summary

AaaG is a polyglot micro-services system (Next.js 14, Go/Gin, Python FastAPI, Supabase/PostgreSQL) at an early MVP stage. Several secure-by-default practices are in place via automation hooks, but material gaps exist — most critically the complete absence of a CI pipeline and unresolved complexity in the Stripe webhook handler.

---

## Secrets Management

Environment variables are the designated secret-injection mechanism across all three services. Each service ships an `.env.example` template (`ai-service/.env.example`, `api/.env.example`) and the README instructs operators to `cp .env.example .env` and populate secrets before running (`README.md:19-35`). The Anthropic API key is referenced by name as `${ANTHROPIC_API_KEY}` in `ai-service/.env.example` — no secret value is inlined.

A dedicated hook, `.claude/hooks/protect-env.sh`, is wired to guard against accidental exposure of `.env` files at the agent-automation layer (`.claude/hooks/protect-env.sh`). The `.gitignore` file is present at the repo root (`.gitignore`) and is expected to exclude `.env` files from version control, though the exact entries cannot be confirmed from the readings above.

**Risk:** There is no evidence of a secrets-scanning step in CI (no CI configuration files were found at this commit). Without automated secret-leak detection on every push, the `.env.example` convention and the `protect-env.sh` hook are the only controls preventing accidental secret commits.

---

## CI / CD & Automated Security Gates

**No CI pipeline configuration files were found in the repository at this commit.** This is a significant gap: there are no automated checks for dependency vulnerabilities, static analysis, secret scanning, or test execution on pull requests.

Partial mitigation exists through agent-layer shell hooks under `.claude/hooks/`:

| Hook | Purpose |
|------|---------|
| `.claude/hooks/security-scan.sh` | Security scanning (agent-triggered) |
| `.claude/hooks/protect-env.sh` | Blocks `.env` file exposure |
| `.claude/hooks/protect-git-push.sh` | Guards git push operations |
| `.claude/hooks/protect-prod.sh` | Production environment protection |
| `.claude/hooks/protect-destructive.sh` | Blocks destructive operations |
| `.claude/hooks/audit-log.sh` | Audit trail for agent actions |

These hooks operate at the agent-automation layer, not at the repository/CI layer. They do not substitute for branch-protection-enforced CI checks on every pull request.

---

## Webhook Security (Stripe)

The Stripe inbound webhook is handled in `api/internal/handlers/webhooks.go`. This file is flagged as the **highest TODO-density file in the codebase** (`api/internal/handlers/webhooks.go:1`). Stripe webhook handlers require signature verification (using the `Stripe-Signature` header and a shared webhook secret) to prevent spoofed payment events. The presence of unresolved TODOs in this file is a material risk indicator — it suggests the handler may be incomplete or that known issues have been deferred.

**Risk:** If Stripe signature verification is not implemented or is bypassed, an attacker could POST crafted payment-success events to trigger order fulfillment without actual payment.

---

## Dependency Supply Chain

Dependencies are declared but no lockfile auditing or vulnerability scanning is evidenced in CI:

- **Python (AI service):** `ai-service/requirements.txt` — pip requirements file; no `pip audit` or equivalent in CI.
- **Go (API):** `api/go.mod` and `api/go.sum` — Go module files; `go.sum` provides hash pinning for all transitive dependencies, which is a positive control. No `govulncheck` in CI.
- **Node.js (Platform):** `platform/package.json` and `platform/package-lock.json` — npm lockfile is present, providing deterministic installs. No `npm audit` in CI.

The Go module system's `go.sum` (`api/go.sum`) is the strongest supply-chain control present, as it cryptographically pins all dependency hashes. The npm lockfile (`platform/package-lock.json`) provides deterministic resolution but not hash verification at the same level.

---

## Inter-Service Communication

All inter-service calls use plain HTTP REST with no evidence of mutual TLS or service-mesh authentication (`README.md:9-11`):

- Platform → API: HTTP on port 8080 (`README.md:9`)
- API → AI Service: HTTP on port 8000 (`README.md:11`)
- Stripe → API: Inbound webhook POST (`api/internal/handlers/webhooks.go:1`)
- Platform → Supabase: Supabase client SDK via `platform/lib/`

**Risk:** In a local/development context this is acceptable, but if services are deployed without a private network boundary or API gateway enforcing authentication between services, the AI service endpoint (port 8000) and the Go API (port 8080) are potentially reachable without authentication from outside the trust boundary.

---

## Database Access Pattern

The platform front-end makes **direct database calls** to Supabase via the client SDK from `platform/lib/`, bypassing the Go API for read-heavy dashboard queries (consistent with standard Next.js + Supabase patterns). This means Supabase Row-Level Security (RLS) policies are the sole access-control layer for those queries. If RLS is not correctly configured in `supabase/migrations/`, customer data could be cross-readable. The migration files exist under `supabase/migrations/` but their RLS configuration cannot be confirmed from the readings provided.

---

## Branch & Merge Protection (Agent Layer)

The `.claude/hooks/protect-git-push.sh` hook and `.claude/settings.json` enforce agent-level branch protection (`.claude/hooks/protect-git-push.sh`, `.claude/settings.json`). The audit log hook (`.claude/hooks/audit-log.sh`) provides a trail of agent-initiated actions. PR auto-drafting is handled by `.claude/hooks/auto-draft-pr.sh`. These controls are consistent with the hard rule requiring all changes to go through a named branch and PR review before merge.

---

## Key Risks (Prioritized)

| Priority | Risk | Location |
|----------|------|----------|
| P0 | No CI pipeline — no automated security gates on PRs | (no CI files found) |
| P0 | Webhook handler has unresolved TODOs — Stripe signature verification status unknown | `api/internal/handlers/webhooks.go:1` |
| P1 | No secret scanning in CI — `.env` leak prevention relies solely on hooks and `.gitignore` | `.claude/hooks/protect-env.sh`, `ai-service/.env.example`, `api/.env.example` |
| P1 | Supabase RLS posture unverifiable from available readings — direct client SDK access from platform | `platform/lib/`, `supabase/migrations/` |
| P2 | Inter-service HTTP (no mTLS) — acceptable in dev, must be addressed before production | `README.md:9-11` |
| P2 | No `pip audit` / `govulncheck` / `npm audit` in CI | `ai-service/requirements.txt`, `api/go.mod`, `platform/package.json` |

# Hot spots

**Webhook handler — highest complexity, known incomplete work.**
`api/internal/handlers/webhooks.go` is the only file in the codebase flagged with TODO/FIXME markers and carries the highest TODO density of any file (`api/internal/handlers/webhooks.go:1`). This file owns the Stripe inbound payment webhook path — the critical gate between a payment event and order fulfillment. Unresolved TODOs here are a P0 concern because incomplete or missing Stripe signature verification would allow spoofed payment-success events to trigger fulfillment without actual payment.

**No CI pipeline — zero automated gates on every PR.**
No CI configuration files were found in the repository at this commit. All three service stacks — Python (`ai-service/requirements.txt`), Go (`api/go.mod`), and Node.js (`platform/package.json`) — have no automated test execution, dependency vulnerability scanning, secret scanning, or static analysis enforced on pull requests. The only automated controls are agent-layer shell hooks under `.claude/hooks/`, which do not substitute for repository-enforced CI checks.

**Direct Supabase client access from the platform front-end.**
`platform/lib/` contains Supabase client SDK code that makes direct database calls, bypassing the Go API for read-heavy dashboard queries. This means Supabase Row-Level Security (RLS) policies in `supabase/migrations/` are the sole access-control layer for those queries. The RLS configuration cannot be verified from available readings, making this a latent data-exposure hot spot.

**AI service stateless but externally reachable.**
The AI service (`ai-service/main.py`) listens on port 8000 with no evidence of inter-service authentication (`README.md:9-11`). Any caller that can reach port 8000 can invoke Claude-backed generation endpoints, incurring `${ANTHROPIC_API_KEY}` spend. Route handlers are organized under `ai-service/routers/` with core logic in `ai-service/core/`, but no authentication middleware is evidenced in the available readings.

---

# Tech-debt register

| ID | Severity | Description | Location |
|----|----------|-------------|----------|
| TD-01 | Critical | Unresolved TODOs in Stripe webhook handler — Stripe signature verification status unknown; spoofed payment events are a live risk | `api/internal/handlers/webhooks.go:1` |
| TD-02 | Critical | No CI pipeline — no automated test execution, secret scanning, dependency auditing, or static analysis on any PR across all three stacks | (no CI files found in repo) |
| TD-03 | High | No `pip audit` for Python dependencies — supply-chain vulnerabilities in AI service go undetected | `ai-service/requirements.txt` |
| TD-04 | High | No `govulncheck` for Go dependencies — despite `go.sum` hash pinning (`api/go.sum`), known CVEs in transitive deps are not surfaced | `api/go.mod`, `api/go.sum` |
| TD-05 | High | No `npm audit` in CI for platform dependencies — lockfile present but vulnerabilities not scanned | `platform/package.json`, `platform/package-lock.json` |
| TD-06 | High | Supabase RLS posture unverifiable — platform makes direct DB calls via client SDK; if RLS is misconfigured, cross-customer data reads are possible | `platform/lib/`, `supabase/migrations/` |
| TD-07 | Medium | Inter-service communication is plain HTTP with no mTLS or service-mesh authentication — acceptable in local dev, must be hardened before production | `README.md:9-11` |
| TD-08 | Medium | Secret scanning relies solely on agent hooks and `.gitignore` convention — no repository-enforced scanning on push or PR | `.claude/hooks/protect-env.sh`, `ai-service/.env.example`, `api/.env.example` |
| TD-09 | Medium | Database schema applied manually via Supabase SQL editor — no automated migration runner or migration-state tracking in CI/CD | `supabase/migrations/`, `README.md:33-35` |
| TD-10 | Low | Six templates (`event-app`, `personal-diary`, `portfolio-website`, `recipe-app`, `travel-planner`, `trip-game`) are standalone Next.js apps with no evidenced shared dependency management — version drift across templates is likely over time | `templates/` (directory tree) |
| TD-11 | Low | OpenAPI spec changes tracked as discrete documents in `openspec/changes/` with no CI enforcement that implementation matches spec — contract drift between `api/` and `ai-service/` is undetected | `openspec/config.yaml`, `openspec/changes/` |

---

# Recent incidents (last 90d)

No incident records, post-mortems, or `TRIAGE_REPORT.md` entries describing production incidents in the last 90 days are surfaced in the available repo readings. The triage framework document exists at `docs/TRIAGE_FRAMEWORK.md` and a triage report at `docs/TRIAGE_REPORT.md`, but their contents are not included in the provided readings and cannot be cited without fabrication.

The only commit visible in the recent history is a documentation/dossier merge (`f5ab55c` — merge of PR #15, a dossier refresh). No rollback commits, hotfix branches, or incident-tagged commits appear in the commit log provided.

**High-churn files in the 90-day window** are exclusively infrastructure and agent-configuration files (all with 1 touch each): `.claude/hooks/` scripts, `.claude/settings.json`, `.gitignore`, `CLAUDE.md`, `CONTRIBUTING.md`, and `.agents/skills/neon-postgres/SKILL.md`. This pattern is consistent with a project in initial setup/tooling phase rather than one recovering from production incidents.

*If `docs/TRIAGE_REPORT.md` contains incident records, those should be reviewed directly and this section updated accordingly.*

---

# Open questions for operator

1. **Stripe webhook signature verification** — Has Stripe signature verification been implemented in `api/internal/handlers/webhooks.go`? The file carries the repo's highest TODO density (`api/internal/handlers/webhooks.go:1`). If not implemented, this is a P0 security gap that must be resolved before any live payment volume is accepted. Can the operator confirm current status and authorize prioritization as the next engineering task?

2. **CI pipeline decision** — No CI configuration was found in the repository at this commit. Is the absence intentional (cost/time trade-off for MVP phase), or is CI setup blocked on a tooling decision (GitHub Actions vs. another provider)? Given that all three stacks have no automated security gates, the operator should authorize CI setup as a near-term priority and confirm the preferred CI provider.

3. **Supabase RLS configuration** — The platform front-end makes direct database calls via the Supabase client SDK (`platform/lib/`), making RLS the sole access-control layer for customer data. Has RLS been configured and reviewed in `supabase/migrations/`? If not, cross-customer data exposure is possible today. Operator sign-off on the RLS posture (or a remediation timeline) is needed before onboarding real customers.

4. **Current build phase and go-live timeline** — The README describes four build phases (`README.md:43-50`). Which phase is the project currently in, and what is the target date for Phase 2 automation (Go API + AI service + Vercel auto-deploy)? This determines urgency for resolving TD-01 through TD-08 above.

5. **Inter-service authentication in production** — All inter-service calls use plain HTTP with no mTLS or service-mesh authentication (`README.md:9-11`). Is there a private network boundary (e.g., Vercel private networking, VPC) planned for production that would contain the AI service (port 8000) and Go API (port 8080) from public reachability? If not, an authentication layer between services must be designed before production launch.

6. **Template dependency governance** — Six standalone Next.js templates exist under `templates/` with no evidenced shared dependency management. Who owns version upgrades across templates, and is there a policy for keeping them in sync? As the template library grows, ungoverned version drift will become a maintenance burden.

7. **OpenAPI contract enforcement** — The OpenAPI spec is tracked in `openspec/config.yaml` with changes in `openspec/changes/`, but there is no CI step to validate that the implementation matches the spec. Should contract testing (e.g., `oapi-codegen` for Go, `openapi-python-client` for the AI service) be added to the CI pipeline once CI is established? Operator direction on contract-enforcement strategy is needed.
