# Go API

## Overview

The Go API is a Gin-based REST service that manages orders, payments, and app lifecycle for the AaaG marketplace. It orchestrates between the Platform (Next.js) and the AI Service (Python FastAPI).

## Local Setup

### Prerequisites

- Go 1.21+
- A Supabase project (create at https://supabase.com)
- An Anthropic API key (for the AI Service; get one at https://console.anthropic.com)
- Stripe API keys (for payment processing; get from https://stripe.com)

### Installation

```bash
cd api

# Create a .env file with all required keys
cp .env.example .env
# Edit .env and add the following environment variables:
#   - DATABASE_URL (Supabase PostgreSQL connection string)
#   - ANTHROPIC_API_KEY (for calling the AI Service)
#   - STRIPE_SECRET_KEY (for payment processing)
#   - STRIPE_PUBLISHABLE_KEY (for frontend payment forms)
#   - JWT_SECRET (for session management)

# Install dependencies
go mod tidy

# Run the server
go run ./cmd/server
```

The API will be available at `http://localhost:8080`.

### Environment Variables

**Required:**
- `DATABASE_URL` — Supabase PostgreSQL connection string (format: `postgres://user:password@host:port/database`)
- `ANTHROPIC_API_KEY` — Your Anthropic API key (get from https://console.anthropic.com)
- `STRIPE_SECRET_KEY` — Your Stripe secret key (get from https://dashboard.stripe.com/apikeys)
- `STRIPE_PUBLISHABLE_KEY` — Your Stripe publishable key (get from https://dashboard.stripe.com/apikeys)
- `JWT_SECRET` — A random string used to sign session tokens (generate with `openssl rand -base64 32`)

**Optional:**
- `GIN_MODE` — Set to `release` for production (default: `debug`)
- `PORT` — Port to bind to (default: `8080`)

## API Contract

### POST /api/orders

Create a new order and generate personalized content.

**Request:**
```json
{
  "user_id": "string (UUID)",
  "template_id": "string (UUID)",
  "prompt": "string (user input for personalization)",
  "max_tokens": "integer (optional, default 1024, range 1-5000)"
}
```

**Response (Success, 200):**
```json
{
  "order_id": "string (UUID)",
  "status": "string (pending|processing|completed|failed)",
  "created_at": "string (ISO 8601 timestamp)",
  "app_url": "string (optional, populated when status=completed)"
}
```

**Response (Error, 4xx/5xx):**
```json
{
  "error": "string (error type)",
  "message": "string (human-readable message)",
  "status_code": "integer"
}
```

## Testing

### Unit Tests

```bash
# Run unit tests
go test ./... -v
```

Unit tests validate:
- Order creation and validation
- Payment state transitions
- AI Service integration
- Error handling and propagation

## Architecture

See [ARCHITECTURE.md](../ARCHITECTURE.md) for the full service topology and data flow.

## Known Issues

All TODO and FIXME annotations are tracked in the [triage framework](../docs/TRIAGE_FRAMEWORK.md). Current high-priority items:

- **Payment state machine** — Incomplete transitions may leave orders in indeterminate state
- **TODO/FIXME audit** — All items must be resolved or tracked before Phase 2 completion

See [CONTRIBUTING.md](../CONTRIBUTING.md) for the TODO/FIXME triage framework.

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for branch naming, PR process, and TODO/FIXME triage framework.
