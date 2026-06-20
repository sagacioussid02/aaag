# Platform

## Overview

The Platform is a Next.js 14 (TypeScript) application that provides the user-facing landing page, no-code wizard, and dashboard for the AaaG marketplace. Users create personalized micro-apps by filling out the wizard, which submits orders to the Go API.

## Local Setup

### Prerequisites

- Node.js 18+
- npm
- The Go API running locally (see [api/README.md](../api/README.md))
- The AI Service running locally (see [ai-service/README.md](../ai-service/README.md))

### Installation

```bash
cd platform

# Install dependencies
npm install

# Run the development server
npm run dev
```

The platform will be available at `http://localhost:3000`.

### Environment Variables

**Optional:**
- `NEXT_PUBLIC_API_URL` — URL of the Go API (default: `http://localhost:8080`)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — Stripe publishable key for payment forms

## Wizard Flow

The no-code wizard is the primary user-facing feature. Users:

1. Select a template (e.g., "Birthday Gift", "Thank You Card")
2. Enter personalization input (e.g., "Make it funny and include emojis")
3. Review the generated content
4. Complete payment via Stripe
5. Access their personalized app on the dashboard

### Wizard Entry Point

The wizard is located at `/wizard` and can be accessed from the landing page.

### Known Gaps

A comprehensive audit of the wizard flow is in progress. Current gaps and blockers are tracked in the following issues:

- [Wizard Flow Audit Issues](https://github.com/minions/AaaG/issues?q=label%3Awizard-audit) — See GitHub issues labeled `wizard-audit` for detailed gap documentation and severity classification.

All wizard flow gaps are documented with severity classification, and blocking gaps are filed as tracked issues. No new wizard surface ships without CI coverage.

## Dashboard

The dashboard displays all user-created apps and allows management of orders and settings.

## Testing

### Unit Tests

```bash
# Run unit tests
npm run test
```

### E2E Tests

```bash
# Run end-to-end tests (requires all services running)
npm run test:e2e
```

## Architecture

See [ARCHITECTURE.md](../ARCHITECTURE.md) for the full service topology and data flow.

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for branch naming, PR process, and TODO/FIXME triage framework.
Open http://localhost:3000 in your browser.

## Wizard Flow

The no-code wizard is the primary user-facing feature. It guides users through:

1. **App Configuration** — Name, description, template selection
2. **Customization** — Color scheme, tone, and content preferences
3. **Review & Deploy** — Confirm settings and trigger deployment
4. **Payment** — Stripe payment for app deployment
5. **Confirmation** — Display deployed app link and dashboard access

### Wizard Entry Point

The wizard is accessible at `/wizard` and is the primary conversion surface for new users.

### Known Gaps

The following gaps in the wizard flow have been identified and are tracked as issues:

- **Wizard Flow Audit** — See [ARCHITECTURE.md](../ARCHITECTURE.md#known-gaps-and-tracked-issues) for complete list of tracked issues
- All wizard surface gaps are documented with severity classification
- Blocking gaps are filed as tracked issues and will be addressed in Sprint N+1

For the complete wizard audit, see the sprint planning documentation.

## Project Structure

```
platform/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Landing page
│   ├── wizard/            # Wizard flow pages
│   │   ├── page.tsx       # Wizard entry point
│   │   ├── config/        # App configuration step
│   │   ├── customize/     # Customization step
│   │   ├── review/        # Review & deploy step
│   │   └── payment/       # Payment step
│   └── dashboard/         # User dashboard
├── components/            # Reusable React components
├── lib/                   # Utility functions
├── public/                # Static assets
├── styles/                # Global styles
├── .env.example           # Environment variable template
└── package.json
```

## API Integration

The platform communicates with the Go API for:

- **POST /api/orders** — Create a new app order
- **GET /api/orders/:order_id** — Fetch order status and app URL
- **POST /api/payments** — Process payment for an order

See [ARCHITECTURE.md](../ARCHITECTURE.md#inter-service-request-response-schema-baseline) for request/response schemas.

## Testing

```bash
# Run tests
npm run test

# Run linting
npm run lint

# Build for production
npm run build
```

## Deployment

The platform is designed to deploy to Vercel:

```bash
# Deploy to Vercel
vercel deploy
```

Set environment variables in Vercel dashboard:
- `NEXT_PUBLIC_API_URL` — Production Go API URL
- `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` — Production Stripe key

## Troubleshooting

### "Cannot connect to API"

Ensure the Go API is running on http://localhost:8080 and `NEXT_PUBLIC_API_URL` is set correctly in `.env.local`.

### "Wizard not loading"

Check browser console for errors. Ensure all environment variables are set in `.env.local`.

### "Payment fails"

Ensure `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` is set and matches your Stripe account.

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for branch naming, PR process, and code standards.
