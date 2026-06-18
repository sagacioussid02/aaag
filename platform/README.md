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
