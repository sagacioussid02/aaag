# AaaG Platform

Next.js 14 (TypeScript) landing page, no-code wizard, and user dashboard.

## Local Setup

### Prerequisites

- Node.js 18+ and npm
- Go API running on http://localhost:8080
- AI Service running on http://localhost:8000 (optional for local dev, required for full flow)

### Installation

```bash
cd platform
npm install
```

### Environment Variables

Create a `.env.local` file in the `platform/` directory:

```bash
cp .env.example .env.local
```

Then update with your values:

```
# Go API endpoint
NEXT_PUBLIC_API_URL=http://localhost:8080

# AI Service endpoint (optional for local dev)
NEXT_PUBLIC_AI_SERVICE_URL=http://localhost:8000

# Stripe public key (for payment UI)
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_...
```

**Note:** Do not commit `.env.local` to version control. Use `.env.example` to document required variables.

### Running Locally

```bash
npm run dev
```

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
