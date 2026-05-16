## Why

AaaG needs one customer-demo-ready workflow for gifting a personalized app by May 16, 2026. A portfolio website is the best first paid product because it can be generated from a resume, rendered as a rich frontend preview, and delivered through the existing template/config architecture without needing Stripe, GitHub, or Vercel automation on day one.

## What Changes

- Add a `portfolio-website` system template to the marketplace and dashboard.
- Add an authenticated gift-oriented intake flow where a buyer can upload a PDF resume, optionally upload a cover letter PDF, and add notes for either themselves or a recipient.
- Generate a structured portfolio configuration from uploaded documents and user notes.
- Show a side-by-side review screen with editable extracted details and a live portfolio preview.
- Add plan selection without payment processing for MVP:
  - Free trial: 2 days
  - One-time: public portfolio deployment
  - Managed: public portfolio deployment plus future maintenance/traffic-based pricing
- Create order/build records after plan selection and show a dashboard status page that says the user will be notified when ready.
- Use a shared portfolio template deployment model for MVP, while leaving the data model open for future per-customer repository deployment.
- Track build/deployment status, logs, estimated internal cost, and final public URL.
- Defer real Stripe, GitHub repo creation, Vercel API deployment, and email notification to explicit follow-up tasks.

## Capabilities

### New Capabilities

- `portfolio-marketplace`: Authenticated users can discover and select the portfolio website product from their dashboard/template marketplace.
- `portfolio-intake-preview`: Users can upload portfolio source documents, generate structured portfolio data, edit extracted details, and preview the resulting site side by side.
- `portfolio-plan-ordering`: Users can select a portfolio plan and create a no-payment MVP order/build request.
- `portfolio-build-status`: Users can track portfolio build/deployment status, logs, costs, and public links from the dashboard.

### Modified Capabilities

- None.

## Impact

- Platform UI: dashboard, template detail, customization/intake wizard, preview renderer, plan selection, build status pages.
- Platform API routes: PDF upload, AI generation, order/build creation, build status retrieval.
- Database migrations: portfolio template seed, orders/builds/deployment logs/cost fields, uploaded source document references.
- AI service: new `portfolio-website` generator that returns structured portfolio config from resume, cover letter, and notes.
- Templates: shared `portfolio-website` manifest and renderer based on the existing Sidspace design direction.
- Future integrations: Stripe, GitHub repo creation, Vercel deployment automation, and email notification hooks remain planned but not required for the MVP demo.
