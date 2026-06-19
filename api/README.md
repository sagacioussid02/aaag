# AaaG Go API

Go + Gin REST API for orders, payments, and app lifecycle management.

## Local Setup

### Prerequisites

- Go 1.21+
- PostgreSQL (via Supabase or local)
- Stripe API keys (for payment processing)

### Installation

```bash
cd api
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
