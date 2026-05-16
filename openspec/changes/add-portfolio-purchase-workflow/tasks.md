## 1. OpenSpec And Data Contracts

- [x] 1.1 Validate this OpenSpec change with `openspec validate add-portfolio-purchase-workflow --strict`.
- [x] 1.2 Define TypeScript `PortfolioConfig`, `PortfolioSourceDocument`, `PortfolioPlan`, and `PortfolioBuild` types in `platform/lib/types.ts`.
- [x] 1.3 Define matching AI request/response shapes for `portfolio-website` in the AI service.
- [x] 1.4 Add a `portfolio-website` manifest under `templates/portfolio-website/manifest.json`.

## 2. Database And Template Seed

- [x] 2.1 Add a Supabase migration for `portfolio_source_documents`, `orders` if missing, `app_builds`, and `app_build_logs`.
- [x] 2.2 Seed the `portfolio-website` system template with PDF upload fields, notes fields, gift/self-gift fields, theme preferences, and plan picker metadata.
- [x] 2.3 Add DB helper functions for creating portfolio drafts, storing source document references, creating orders/builds, appending build logs, and reading dashboard status.
- [x] 2.4 Preserve `deployment_strategy = shared_template` in build/order records for MVP.

## 3. Portfolio AI Generation

- [x] 3.1 Add `ai-service/routers/portfolio.py` with a `generate(user_config)` function.
- [x] 3.2 Register `portfolio-website` in `ai-service/main.py`.
- [x] 3.3 Implement PDF text extraction path for resume PDF and optional cover letter PDF.
- [x] 3.4 Prompt Claude to return structured portfolio config with profile, experience, projects, skills, education, theme, source summary, and quality flags.
- [x] 3.5 Add recoverable error handling for failed parsing or AI generation.

## 4. Platform Intake And Preview

- [x] 4.1 Add dashboard entry point showing the AI Portfolio Website product for authenticated users.
- [x] 4.2 Add portfolio intake pages for gift/self-gift mode, buyer/recipient details, PDF resume upload, optional cover letter PDF upload, and notes.
- [x] 4.3 Extend upload validation to support portfolio PDF documents separately from existing image upload fields.
- [x] 4.4 Add API route to generate a portfolio draft from uploaded documents and notes.
- [x] 4.5 Build the side-by-side review screen with editable extracted data and live portfolio preview.
- [x] 4.6 Persist the approved portfolio config as an app draft before plan selection.

## 5. Plan Selection And Confirmation

- [x] 5.1 Add plan selection UI for free trial, one-time, and managed plans.
- [x] 5.2 Create order/build records after plan selection without Stripe payment.
- [x] 5.3 Route the user to a confirmation/status page that says they will be notified when the app is ready.
- [x] 5.4 For MVP, mark builds as public shared-template deployments and expose a generated public URL.

## 6. Portfolio Renderer And Public App

- [x] 6.1 Create a shared portfolio renderer inspired by Sidspace but driven entirely by `PortfolioConfig`.
- [x] 6.2 Add `portfolio-website` handling to the existing `/apps/[id]` renderer switch.
- [x] 6.3 Ensure the preview renderer and public renderer share the same data contract.
- [x] 6.4 Verify responsive layout and readable text on desktop and mobile.

## 7. Dashboard Status, Logs, Metrics

- [x] 7.1 Add dashboard list/status view for generated portfolio apps.
- [x] 7.2 Add build status page showing queued/generating/deploying/live/failed states.
- [x] 7.3 Add timestamped user-safe build logs.
- [x] 7.4 Add estimated AI generation cost and deployment cost placeholder fields.
- [x] 7.5 Show dashboard-ready notification state when the portfolio is live.

## 8. Day-Two Follow-Ups

- [ ] 8.1 Add Resend email notification when portfolio build reaches live status.
- [ ] 8.2 Add Stripe checkout for one-time and managed plans.
- [ ] 8.3 Add DOC/DOCX upload and parsing support.
- [ ] 8.4 Add GitHub repo creation for premium per-customer repository plans.
- [ ] 8.5 Add Vercel API deployment for per-customer repositories.
- [ ] 8.6 Add Terraform or predefined infrastructure automation if shared-template hosting is no longer enough.
- [ ] 8.7 Add traffic-based managed plan pricing and usage metering.

## 9. Verification

- [ ] 9.1 Run `npm run lint` in `platform/`.
- [ ] 9.2 Run `npm run build` in `platform/`.
- [ ] 9.3 Run the AI service locally and test `portfolio-website` generation with a sample resume PDF.
- [ ] 9.4 Manually test full flow: login, dashboard, portfolio selection, upload, preview edit, plan select, confirmation, dashboard status, public portfolio URL.
