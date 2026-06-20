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
go mod tidy
```

### Environment Variables

Create a `.env` file in the `api/` directory:

```bash
cp .env.example .env
```

Then update with your values:

```
# Database connection (Supabase PostgreSQL)
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Stripe API key (secret key, not public)
STRIPE_API_KEY=sk_test_...

# AI Service endpoint
AI_SERVICE_URL=http://localhost:8000

# JWT secret (for authentication, if implemented)
JWT_SECRET=your-secret-key-here

# Server port
PORT=8080

# Environment
ENVIRONMENT=development
```

**Important:** Do not commit `.env` to version control. Use `.env.example` to document required variables.

### Running Locally

```bash
go run ./cmd/server
```

The API will start on http://localhost:8080.

## API Endpoints

### Orders

#### POST /api/orders
Create a new app order.

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

#### GET /api/orders/:order_id
Fetch order status and app URL.

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

### Payments

#### POST /api/payments
Process payment for an order.

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

For complete request/response schemas, see [ARCHITECTURE.md](../ARCHITECTURE.md#inter-service-request-response-schema-baseline).

## Project Structure

```
api/
├── cmd/
│   └── server/            # Main server entry point
├── internal/
│   ├── handlers/          # HTTP request handlers
│   ├── models/            # Data models
│   ├── services/          # Business logic
│   ├── db/                # Database layer
│   └── middleware/        # HTTP middleware
├── migrations/            # Database migrations
├── .env.example           # Environment variable template
├── go.mod
├── go.sum
└── README.md
```

## Database

The API uses PostgreSQL (Supabase) for data storage.

### Migrations

Run migrations before starting the server:

```bash
# Using migrate tool (if installed)
migrate -path migrations -database "$DATABASE_URL" up

# Or manually run SQL files in order
# See supabase/migrations/ in the root directory
```

## Payment Processing

Payments are processed via Stripe. The API:

1. Receives payment request from Platform
2. Validates order and amount
3. Calls Stripe API to process payment
4. Updates order status in database
5. Returns payment confirmation to Platform

**Note:** Payment state machine has known incomplete transitions (tracked as P0 bug). See [ARCHITECTURE.md](../ARCHITECTURE.md#known-gaps-and-tracked-issues).

## AI Service Integration

The API calls the AI Service to generate content:

1. After order creation, API sends request to AI Service
2. AI Service generates content using Claude
3. API stores generated content in database
4. API updates order status to "completed"

**Note:** AI Service error responses may not be properly propagated (tracked as P0 bug). See [ARCHITECTURE.md](../ARCHITECTURE.md#known-gaps-and-tracked-issues).

## Testing

```bash
# Run tests
go test ./...

# Run tests with coverage
go test -cover ./...

# Run linting
golangci-lint run
```

## Building

```bash
# Build binary
go build -o bin/server ./cmd/server

# Build Docker image
docker build -t aaag-api .
```

## Deployment

The API is designed to deploy to Cloud Run or similar containerized environment:

```bash
# Build and push Docker image
docker build -t gcr.io/PROJECT_ID/aaag-api .
docker push gcr.io/PROJECT_ID/aaag-api

# Deploy to Cloud Run
gcloud run deploy aaag-api --image gcr.io/PROJECT_ID/aaag-api
```

Set environment variables in deployment:
- `DATABASE_URL` — Production PostgreSQL URL
- `STRIPE_API_KEY` — Production Stripe key
- `AI_SERVICE_URL` — Production AI Service URL
- `JWT_SECRET` — Production JWT secret

## Troubleshooting

### "Cannot connect to database"

Ensure `DATABASE_URL` is set correctly in `.env` and PostgreSQL is running.

### "Stripe payment fails"

Ensure `STRIPE_API_KEY` is set and is a valid secret key (not public key).

### "AI Service not responding"

Ensure AI Service is running on the URL specified in `AI_SERVICE_URL`.

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for branch naming, PR process, and code standards.
