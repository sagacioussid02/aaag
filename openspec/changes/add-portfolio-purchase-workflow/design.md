## Context

AaaG currently has a Next.js platform, a Go API skeleton, a Python AI service, Supabase schema/storage work, and template manifests. The fastest customer-demo path is to build the portfolio flow primarily in `platform/` using Supabase as the source of truth, while keeping Go API and external deployment automation as day-two integration points.

The Sidspace project at `/Users/siddharthshankar/workspace/sidspace` is the visual reference for the portfolio website. Its current data model is hardcoded in `lib/data.ts`; the AaaG version should turn that data into a generated, editable, versioned config that a shared portfolio renderer can consume.

## Goals / Non-Goals

**Goals:**

- Ship one demo-ready purchasable app workflow by May 16, 2026: AI Portfolio Website.
- Preserve the core AaaG gift model while supporting self-gifting.
- Accept PDF resume first and optional PDF cover letter for MVP.
- Generate structured portfolio config via AI and allow review/edit before ordering.
- Show side-by-side editable details and live preview.
- Let users select a plan without Stripe and continue to a dashboard/status page.
- Publicly expose the generated portfolio during MVP using a shared-template approach.
- Track dashboard status, logs, deployment URL, and estimated internal cost.
- Add task-level placeholders for email notification, DOC/DOCX support, Stripe, GitHub, and Vercel automation.

**Non-Goals:**

- Real Stripe checkout or subscription management.
- GitHub repository creation.
- Vercel project creation/deployment through API.
- Terraform-managed deployment infrastructure.
- DOC/DOCX parsing in the first pass.
- Fully automated email delivery for MVP.

## Decisions

### 1. Implement MVP workflow in the Next.js platform first

Use `platform/` API routes and Supabase REST access for the demo workflow. The Go API already models the longer-term backend, but key handlers are stubs. Building the demo through the platform minimizes service coordination and lets the existing wizard/app rendering code move fastest.

Alternative considered: implement the full flow in Go. That is cleaner long-term but slower because it requires DB wiring, auth/session integration, and replacing existing platform API behavior.

### 2. Use a shared portfolio template for MVP deployment

The MVP should store generated portfolio configs in the app database and serve public portfolio pages from the shared platform renderer, e.g. `/apps/{id}` or a future app subdomain. The order/build record should still include `deployment_strategy = shared_template` so future premium plans can use `per_customer_repo`.

Alternative considered: create one GitHub repo and Vercel deployment per customer. This matches the eventual premium workflow but requires tokens and more failure handling than the demo needs.

### 3. Model portfolio data as config, not code edits

The AI service should emit a structured `PortfolioConfig` object with profile, sections, theme, links, source summary, and confidence/missing-info fields. The renderer consumes this config. AI agents can later convert that same config into repo edits for premium plans.

Alternative considered: ask AI to directly edit a Next.js repo. That is powerful later, but it is too slow and hard to preview deterministically for MVP.

### 4. Keep plan selection separate from payment

For MVP, selecting a plan creates an order/build request with payment status like `not_required_mvp` or `pending_manual`. The confirmation page explains the app is being prepared. Stripe becomes a later task, not a blocker.

Alternative considered: integrate Stripe now. It would improve production readiness but does not help the customer demo as much as a polished preview/status loop.

### 5. Dashboard notification first, email later

The app should show ready state in the dashboard and status page. Email notification should be listed in tasks and designed as an eventual Resend-backed notification event.

Alternative considered: email first. Dashboard state is easier to verify locally and avoids deliverability/API-key friction during the demo.

## Data Model

Add or extend tables for the MVP path:

- `templates`: seed `portfolio-website` with config schema and metadata.
- `apps`: store `template_slug`, `config`, `status`, `expires_at`, and public URL fields if not already present in the target DB.
- `orders`: store user, template, selected plan, amount placeholder, payment status, and config snapshot relationship.
- `portfolio_source_documents`: store uploaded resume/cover-letter references, MIME type, size, and extracted text status.
- `app_builds`: store app/order IDs, lifecycle status, deployment strategy, public URL, selected plan, cost estimate, and timestamps.
- `app_build_logs`: timestamped user-safe messages per build.

For the platform-first MVP, these should be implemented as Supabase migrations matching the existing `supabase/migrations/*` source-of-truth direction.

## AI Contract

Add `portfolio-website` to the AI service dispatcher.

Input:

- `user_config.meta`: buyer/recipient/app metadata.
- `user_config.user_inputs`: gift mode, notes, tone, links, preferences.
- `user_config.media` or document references: resume PDF and optional cover letter PDF.
- Extracted text if PDF parsing is done in platform before calling AI.

Output:

- `profile`: name, headline, location, summary, contact.
- `experience`: company, title, dates, location, bullets, technologies.
- `projects`: title, description, impact, links, tags.
- `skills`: grouped skills and featured skills.
- `education`: schools/degrees/certifications.
- `theme`: accent, mode, layout preset.
- `source_summary`: what was inferred and what is missing.
- `quality_flags`: low-confidence fields or follow-up questions.

## Preview Flow

1. User chooses `portfolio-website`.
2. User selects gift/self-gift mode and provides buyer/recipient info.
3. User uploads PDF resume and optional PDF cover letter.
4. User adds notes and preferences.
5. Platform calls AI generation.
6. Review page shows editable extracted data beside live preview.
7. User approves and selects plan.
8. Platform creates order/build/app records.
9. Status page shows queued/generating/deploying/live state, logs, costs, and public URL when available.

## Risks / Trade-offs

- PDF parsing can be unreliable → Start with PDF only, preserve raw upload references, and show recoverable errors.
- Platform-first API can duplicate future Go API work → Keep data contracts close to existing Go models and document migration path.
- Public shared-template deploy is less isolated than per-customer repo → Store deployment strategy explicitly and avoid promising repo ownership in MVP.
- AI-generated portfolio may hallucinate details → Include source summary, quality flags, and editable review before plan selection.
- Current `platform/` worktree is dirty → Avoid unrelated rewrites and keep portfolio changes scoped.

## Migration Plan

1. Add OpenSpec proposal/spec/design/tasks.
2. Add Supabase migrations for portfolio template, documents, orders/builds/logs.
3. Add AI generator and schema.
4. Add platform pages and API routes for portfolio flow.
5. Add shared renderer for portfolio preview/live app.
6. Verify locally with a sample PDF resume.

Rollback: remove the `portfolio-website` template seed or mark it inactive; existing non-portfolio templates remain unaffected.

## Open Questions

- Which PDF parser should be used in `platform/` for extraction, or should extraction happen in `ai-service`?
- Should the initial public portfolio URL be `/apps/{id}` only, or should we also add friendly slugs before Vercel/domain work?
- What exact plan labels/prices should be displayed for the demo?
- What size limit should be enforced for resume and cover-letter PDFs?
