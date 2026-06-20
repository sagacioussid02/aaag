# AaaG Architecture

## Overview

AaaG is a three-service marketplace platform for personalized micro-apps. The system consists of:

1. **Platform** (Next.js 14, TypeScript) — User-facing landing page, no-code wizard, and dashboard
2. **API** (Go + Gin) — Orders, payments, and app lifecycle management
3. **AI Service** (Python FastAPI) — Claude-powered content generation

All services are backed by a PostgreSQL database (Supabase) and communicate via REST APIs.

## Service Topology

```
┌─────────────────────────────────────────────────────────────┐
│                    User Browser                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │  Platform (Next.js)    │
        │  Port 3000             │
        │  - Landing page        │
        │  - Wizard UI           │
        │  - Dashboard           │
        └────────┬───────────────┘
                 │
        ┌────────┴──────────────────────────┐
        │                                   │
        ▼                                   ▼
┌──────────────────┐            ┌──────────────────────┐
│  Go API          │            │  AI Service          │
│  Port 8080       │            │  Port 8000           │
│  - Orders        │            │  - Content Gen       │
│  - Payments      │            │  - Claude API calls  │
│  - App Lifecycle │            │  - Error handling    │
└────────┬─────────┘            └──────────┬───────────┘
         │                                 │
         └─────────────────┬───────────────┘
                           │
                           ▼
                ┌──────────────────────┐
                │  PostgreSQL (Supabase)│
                │  - Orders            │
                │  - Payments          │
                │  - Users             │
                │  - App configs       │
                └──────────────────────┘
```

## Data Flow

### User Creates a Micro-App (Wizard Flow)

1. User fills out the no-code wizard in **Platform** (Next.js)
2. Platform sends POST request to **Go API** (`/api/orders`) with app configuration
3. Go API validates order, creates database record, and returns order ID
4. Platform displays confirmation and redirects to dashboard
5. Go API triggers **AI Service** (`/generate`) to create initial content
6. AI Service calls Anthropic Claude API with user configuration
7. AI Service returns generated content to Go API
8. Go API stores content in PostgreSQL and updates order status
9. Platform polls Go API for order status and displays deployed app link

### Payment Processing

1. User initiates payment in **Platform** dashboard
2. Platform sends POST request to **Go API** (`/api/payments`) with payment details
3. Go API processes payment (Stripe integration)
4. Go API updates order payment status in PostgreSQL
5. Go API returns payment confirmation to Platform
6. Platform displays success/failure to user

## Inter-Service Request/Response Schema Baseline

### Platform → Go API

#### POST /api/orders
**Request:**
```json
{
  "user_id": "uuid",
  "app_name": "string",
  "app_description": "string",
  "template_id": "string",
  "customization": {
    "color_scheme": "string",
    "tone": "string"
  }
}
```

**Response (201):**
```json
{
  "order_id": "uuid",
  "status": "pending",
  "created_at": "ISO8601",
  "app_url": null
}
```

**Response (400/500):**
```json
{
  "error": "string",
  "code": "string"
}
```

#### POST /api/payments
**Request:**
```json
{
  "order_id": "uuid",
  "amount": "number",
  "currency": "string",
  "payment_method": "string"
}
```

**Response (200):**
```json
{
  "payment_id": "uuid",
  "order_id": "uuid",
  "status": "completed",
  "amount": "number"
}
```

#### GET /api/orders/:order_id
**Response (200):**
```json
{
  "order_id": "uuid",
  "status": "completed|pending|failed",
  "app_url": "string or null",
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

### Go API → AI Service

#### POST /generate
**Request:**
```json
{
  "order_id": "uuid",
  "app_name": "string",
  "app_description": "string",
  "template_id": "string",
  "customization": {
    "color_scheme": "string",
    "tone": "string"
  }
}
```

**Response (200):**
```json
{
  "order_id": "uuid",
  "content": "string (HTML/JSX)",
  "metadata": {
    "tokens_used": "number",
    "model": "string"
  }
}
```

**Response (400/500):**
```json
{
  "error": "string",
  "code": "string",
  "details": "string (optional)"
}
```

## Environment Variables

### Platform (Next.js)
- `NEXT_PUBLIC_API_URL` — Go API base URL (e.g., http://localhost:8080)
- `NEXT_PUBLIC_AI_SERVICE_URL` — AI Service base URL (for direct calls, if any)

### Go API
- `DATABASE_URL` — PostgreSQL connection string (Supabase)
- `STRIPE_API_KEY` — Stripe secret key for payment processing
- `AI_SERVICE_URL` — AI Service base URL (e.g., http://localhost:8000)
- `JWT_SECRET` — Secret for signing JWTs (if auth is implemented)
- `PORT` — Server port (default: 8080)

### AI Service
- `ANTHROPIC_API_KEY` — Anthropic API key for Claude access
- `PORT` — Server port (default: 8000)
- `LOG_LEVEL` — Logging level (default: INFO)

## Deployment Architecture

### Local Development

Each service runs independently on its configured port:
- Platform: http://localhost:3000
- Go API: http://localhost:8080
- AI Service: http://localhost:8000
- Database: Supabase cloud (or local Postgres)

### Production (Future)

- Platform: Vercel (Next.js)
- Go API: Cloud Run or similar (containerized)
- AI Service: Cloud Run or similar (containerized)
- Database: Supabase managed PostgreSQL

## Known Gaps and Tracked Issues

The following gaps are documented and tracked for future sprints:

- **Wizard Flow Audit** — Complete audit of all wizard surfaces and validation gaps (see wizard audit issues)
- **OpenAPI Contract Spec** — Full contract specification for inter-service APIs (deferred to Sprint N+1)
- **Secret Management ADR** — Formal decision record for secret management architecture (requires operator approval)
- **Payment State Machine** — Incomplete transitions in order/payment lifecycle (tracked as P0 bug)
- **AI Service Error Propagation** — Unhandled Anthropic SDK error paths (tracked as P0 bug)
- **CI Pipeline** — GitHub Actions matrix for all three services (in progress)

For the complete triage of all TODO/FIXME items, see [docs/TRIAGE_REPORT.md](docs/TRIAGE_REPORT.md).

## Next Steps

1. **Sprint 7** — Complete wizard flow audit, stabilize payment state machine, validate AI SDK contract, establish CI pipeline
2. **Sprint N+1** — Full OpenAPI contract spec, complete wizard flow implementation, secret management implementation
3. **Sprint N+2** — Dashboard features, template expansion, ProductHunt launch preparation
