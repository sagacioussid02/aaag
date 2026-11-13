# AaaG Architecture

## Overview

AaaG (Apps As A Gift) is a three-service marketplace platform for personalized micro-apps. The architecture consists of:

- **Platform** (Next.js 14, TypeScript) — User-facing landing page, no-code wizard, and dashboard
- **API** (Go + Gin) — Backend service for orders, payments, and app lifecycle management
- **AI Service** (Python FastAPI) — Claude-powered content generation via Anthropic SDK
- **Database** (PostgreSQL via Supabase) — Persistent storage for users, orders, apps, and templates

## Service Topology

```
┌─────────────────────────────────────────────────────────────┐
│                    Platform (Next.js)                       │
│              Landing page, wizard, dashboard                │
│                      Port: 3000                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ HTTP/REST
                       │ POST /api/orders
                       │ GET /api/orders/:id
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                   Go API (Gin)                              │
│         Orders, payments, app lifecycle                     │
│                      Port: 8080                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ HTTP/REST
                       │ POST /generate
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              AI Service (FastAPI)                           │
│         Claude-powered content generation                   │
│                      Port: 8000                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ SDK calls
                       │ (Anthropic Python SDK)
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              Anthropic API (external)                       │
│                  Claude models                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              Supabase (PostgreSQL)                          │
│         Shared database for all services                    │
│              (All services connect)                         │
└─────────────────────────────────────────────────────────────┘
```

## Service Responsibilities

### Platform (Next.js 14, TypeScript)

**Port:** 3000  
**Runtime:** Node.js (Vercel-deployable)  
**Responsibilities:**
- Landing page and marketing copy
- No-code wizard UI (multi-step form)
- User dashboard (view orders, download apps)
- Client-side form validation and error display
- Session management and authentication UI

**Key Dependencies:**
- Next.js 14 (React framework)
- TypeScript
- Supabase client (for auth and real-time updates)
- HTTP client for Go API calls

**Owns:**
- User-facing wizard flow and step transitions
- Form state and validation feedback
- Dashboard layout and order display

### API (Go + Gin)

**Port:** 8080  
**Runtime:** Go binary  
**Responsibilities:**
- Order creation and lifecycle management
- Payment processing (Stripe integration)
- User authentication and JWT token issuance
- Triggering AI content generation
- Storing generated content and order metadata
- Health check and readiness probes

**Key Dependencies:**
- Gin (HTTP framework)
- Supabase Go client (database access)
- Stripe SDK (payment processing)
- HTTP client for AI Service calls

**Owns:**
- Order state machine (pending → processing → completed → delivered)
- Payment validation and reconciliation
- Cross-service orchestration (Platform → API → AI Service)
- Database schema and migrations

### AI Service (Python FastAPI)

**Port:** 8000  
**Runtime:** Python (uvicorn ASGI server)  
**Responsibilities:**
- Receive order context and user input from Go API
- Call Anthropic Claude API with structured prompts
- Parse and validate Claude responses
- Return generated content to Go API
- Health check and readiness probes

**Key Dependencies:**
- FastAPI (HTTP framework)
- Anthropic Python SDK (Claude API calls)
- Pydantic (request/response validation)

**Owns:**
- Prompt engineering and template context injection
- Claude API error handling and retries
- Response parsing and validation
- Content quality checks

### Database (Supabase PostgreSQL)

**Shared by:** All three services  
**Responsibilities:**
- User accounts and authentication metadata
- Order records and status tracking
- Generated content storage
- Template definitions and versioning
- Payment transaction logs

**Schema Highlights:**
- `users` — User accounts, email, auth metadata
- `orders` — Order records, user_id, template_id, status, created_at
- `generated_content` — order_id, content_type, content_blob, created_at
- `templates` — Template definitions, name, description, context
- `payments` — Stripe transaction logs, order_id, status, amount

## Data Flow: User Creates a Personalized App (Happy Path)

### Step 1: User Submits Wizard

**Actor:** User in Platform UI  
**Action:** Fills out wizard form (e.g., name, preferences, template selection) and clicks "Create My App"

```
Platform (browser)
  ↓
  POST /api/orders
  {
    "user_id": "uuid",
    "template_id": "uuid",
    "wizard_input": {
      "name": "My App",
      "preferences": { ... },
      "color_scheme": "blue"
    }
  }
  ↓
Go API (port 8080)
```

### Step 2: Go API Validates and Creates Order

**Actor:** Go API  
**Actions:**
1. Validate request schema and user_id
2. Check template exists in database
3. Create order record in `orders` table with status `pending`
4. Return order_id to Platform

```
Go API
  ↓
  INSERT INTO orders (user_id, template_id, status, created_at)
  VALUES (..., ..., 'pending', now())
  ↓
Supabase (PostgreSQL)
```

**Response to Platform:**

```json
{
  "order_id": "uuid",
  "status": "pending",
  "created_at": "2024-01-15T10:30:00Z"
}
```

### Step 3: Go API Triggers AI Content Generation

**Actor:** Go API  
**Action:** Immediately after order creation, POST to AI Service

```
Go API
  ↓
  POST /generate
  {
    "order_id": "uuid",
    "template_id": "uuid",
    "template_context": { ... },
    "user_input": {
      "name": "My App",
      "preferences": { ... }
    }
  }
  ↓
AI Service (port 8000)
```

### Step 4: AI Service Generates Content

**Actor:** AI Service  
**Actions:**
1. Receive order context and user input
2. Load template context from database (if needed)
3. Construct Claude prompt with template + user input
4. Call Anthropic Claude API
5. Parse and validate response
6. Return generated content to Go API

```
AI Service
  ↓
  Call Anthropic API
  (Claude model, structured prompt)
  ↓
Anthropic (external)
  ↓
  Return generated content
  ↓
AI Service
```

**Response to Go API:**

```json
{
  "order_id": "uuid",
  "status": "success",
  "content": {
    "title": "Generated Title",
    "body": "Generated content...",
    "metadata": { ... }
  }
}
```

### Step 5: Go API Stores Generated Content and Updates Order

**Actor:** Go API  
**Actions:**
1. Receive generated content from AI Service
2. Store content in `generated_content` table
3. Update order status to `completed`
4. Trigger payment processing (Stripe)

```
Go API
  ↓
  INSERT INTO generated_content (order_id, content_type, content_blob)
  VALUES (..., 'json', ...)
  ↓
  UPDATE orders SET status = 'completed' WHERE id = ...
  ↓
Supabase (PostgreSQL)
```

### Step 6: Go API Returns Confirmation to Platform

**Actor:** Go API  
**Action:** Return order confirmation with generated content preview

```
Go API
  ↓
  Response to Platform
  {
    "order_id": "uuid",
    "status": "completed",
    "content_preview": { ... },
    "download_url": "https://..."
  }
  ↓
Platform (browser)
```

### Step 7: Platform Displays Confirmation

**Actor:** Platform UI  
**Action:** Display success message and download link to user

```
Platform
  ↓
  Show "Your app is ready!"
  Display download button
  ↓
User
```

## Error Handling Paths

### Validation Error (Platform → Go API)

**Scenario:** User submits wizard with invalid data (e.g., missing required field)

```
Platform
  ↓
  POST /api/orders
  (invalid request)
  ↓
Go API
  ↓
  Validate request
  ↓
  Return 400 Bad Request
  {
    "error": "validation_error",
    "message": "Field 'name' is required",
    "field": "name"
  }
  ↓
Platform
  ↓
  Display inline error message on wizard step
  User can correct and resubmit
```

### AI Generation Failure (Go API → AI Service)

**Scenario:** Claude API returns an error or malformed response

```
Go API
  ↓
  POST /generate
  ↓
AI Service
  ↓
  Call Anthropic API
  ↓
  Error or malformed response
  ↓
  Catch exception, wrap in structured error
  {
    "order_id": "uuid",
    "status": "error",
    "error_code": "claude_api_error",
    "message": "Claude API returned status 429: rate limited"
  }
  ↓
Go API
  ↓
  Receive error, update order status to 'failed'
  Log error for debugging
  Return error to Platform
  ↓
Platform
  ↓
  Display error message to user
  Offer retry or support contact
```

### Payment Failure (Go API → Stripe)

**Scenario:** Stripe payment processing fails

```
Go API
  ↓
  Call Stripe API
  ↓
  Error (e.g., card declined)
  ↓
  Return 402 Payment Required
  {
    "error": "payment_failed",
    "message": "Card was declined",
    "retry_after": 3600
  }
  ↓
Platform
  ↓
  Display payment error and retry prompt
```

## Inter-Service API Contracts

### Platform → Go API: Create Order

**Endpoint:** `POST /api/orders`  
**Authentication:** Bearer token (JWT from auth flow)  
**Request Body:**

```json
{
  "user_id": "string (uuid)",
  "template_id": "string (uuid)",
  "wizard_input": {
    "name": "string",
    "preferences": "object (template-specific)",
    "color_scheme": "string (optional)",
    "additional_fields": "object (optional)"
  }
}
```

**Success Response (201 Created):**

```json
{
  "order_id": "string (uuid)",
  "status": "string (pending|processing|completed|failed)",
  "created_at": "string (ISO 8601)",
  "user_id": "string (uuid)"
}
```

**Error Response (400 Bad Request):**

```json
{
  "error": "string (validation_error|unauthorized|not_found)",
  "message": "string (human-readable)",
  "field": "string (optional, for validation errors)"
}
```

### Platform → Go API: Get Order Status

**Endpoint:** `GET /api/orders/:order_id`  
**Authentication:** Bearer token (JWT)  
**Success Response (200 OK):**

```json
{
  "order_id": "string (uuid)",
  "status": "string (pending|processing|completed|failed)",
  "created_at": "string (ISO 8601)",
  "updated_at": "string (ISO 8601)",
  "content_preview": "object (optional, if completed)",
  "download_url": "string (optional, if completed)",
  "error_message": "string (optional, if failed)"
}
```

### Go API → AI Service: Generate Content

**Endpoint:** `POST /generate`  
**Authentication:** None (internal service call)  
**Request Body:**

```json
{
  "order_id": "string (uuid)",
  "template_id": "string (uuid)",
  "template_context": {
    "template_name": "string",
    "template_version": "string",
    "sections": "array (template-specific structure)"
  },
  "user_input": {
    "name": "string",
    "preferences": "object",
    "color_scheme": "string (optional)"
  }
}
```

**Success Response (200 OK):**

```json
{
  "order_id": "string (uuid)",
  "status": "string (success|error)",
  "content": {
    "title": "string",
    "body": "string",
    "sections": "array (template-specific)",
    "metadata": "object"
  }
}
```

**Error Response (500 Internal Server Error):**

```json
{
  "order_id": "string (uuid)",
  "status": "string (error)",
  "error_code": "string (claude_api_error|malformed_response|timeout)",
  "message": "string (human-readable)"
}
```

## Environment Variables

### Platform (Next.js)

**Required:**
- `NEXT_PUBLIC_API_URL` — Go API base URL (e.g., `http://localhost:8080`)
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous key (public)

**Optional:**
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — Stripe publishable key (for client-side payments)

### Go API

**Required:**
- `DATABASE_URL` — Supabase PostgreSQL connection string
- `AI_SERVICE_URL` — AI Service base URL (e.g., `http://localhost:8000`)
- `STRIPE_SECRET_KEY` — Stripe secret key (for payment processing)
- `JWT_SECRET` — Secret key for signing JWT tokens

**Optional:**
- `PORT` — Server port (default: 8080)
- `LOG_LEVEL` — Logging level (debug, info, warn, error)

### AI Service (Python)

**Required:**
- `ANTHROPIC_API_KEY` — Anthropic API key (for Claude access)
- `DATABASE_URL` — Supabase PostgreSQL connection string (optional, for template context)

**Optional:**
- `PORT` — Server port (default: 8000)
- `CLAUDE_MODEL` — Claude model version (default: claude-3-sonnet-20240229)
- `LOG_LEVEL` — Logging level (debug, info, warning, error)

## Local Development Setup

### Prerequisites

- Docker and Docker Compose (for local Supabase)
- Node.js 18+ (for Platform)
- Go 1.21+ (for API)
- Python 3.10+ (for AI Service)
- Git

### Quick Start with Docker Compose

1. **Clone the repository:**

```bash
git clone https://github.com/sagacioussid02/aaag.git
cd aaag
```

2. **Start all services with Docker Compose:**

```bash
docker-compose up -d
```

This will start:
- Supabase (PostgreSQL on port 5432)
- Go API (port 8080)
- AI Service (port 8000)
- Platform (port 3000)

3. **Verify services are healthy:**

```bash
curl http://localhost:8080/health
curl http://localhost:8000/health
curl http://localhost:3000/health
```

### Manual Setup (for development)

#### 1. Start Supabase

```bash
# Create a Supabase project at https://supabase.com
# Copy connection string to .env files
```

#### 2. Start AI Service (Python)

```bash
cd ai-service
cp .env.example .env
# Add ANTHROPIC_API_KEY to .env
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

#### 3. Start Go API (in another terminal)

```bash
cd api
cp .env.example .env
# Add DATABASE_URL, STRIPE_SECRET_KEY, JWT_SECRET to .env
go mod tidy
go run ./cmd/server
```

#### 4. Start Platform (Next.js, in another terminal)

```bash
cd platform
cp .env.example .env.local
# Add NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SUPABASE_URL, etc. to .env.local
npm install
npm run dev
```

#### 5. Access the platform

Open http://localhost:3000 in your browser.

## Health Check Endpoints

Each service exposes a `/health` endpoint for readiness and liveness probes:

### Go API

```bash
GET /health

Response (200 OK):
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "database": "connected",
  "ai_service": "reachable"
}
```

### AI Service

```bash
GET /health

Response (200 OK):
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "anthropic_api": "reachable"
}
```

### Platform

```bash
GET /health

Response (200 OK):
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Deployment Topology

### Service Startup Order

1. **Supabase (PostgreSQL)** — Database must be ready first
2. **Go API** — Depends on database, serves as orchestrator
3. **AI Service** — Depends on Anthropic API (external)
4. **Platform** — Depends on Go API

### Docker Compose Service Dependencies

The `docker-compose.yml` file encodes this startup order:

```yaml
services:
  supabase:
    # PostgreSQL database
    ports:
      - "5432:5432"

  api:
    # Go API
    depends_on:
      - supabase
    ports:
      - "8080:8080"

  ai-service:
    # Python AI Service
    depends_on:
      - api
    ports:
      - "8000:8000"

  platform:
    # Next.js Platform
    depends_on:
      - api
    ports:
      - "3000:3000"
```

### Port Mapping

| Service | Port | Protocol | Purpose |
|---------|------|----------|----------|
| Platform | 3000 | HTTP | User-facing web UI |
| Go API | 8080 | HTTP/REST | Backend API |
| AI Service | 8000 | HTTP/REST | Content generation |
| Supabase | 5432 | PostgreSQL | Database |

## Cross-Service Communication

### Request Flow

1. **Platform** makes HTTP requests to **Go API** (port 8080)
2. **Go API** makes HTTP requests to **AI Service** (port 8000)
3. **AI Service** makes SDK calls to **Anthropic API** (external)
4. All services read/write to **Supabase** (port 5432)

### Timeouts and Retries

- **Platform → Go API:** 30-second timeout, 3 retries on 5xx
- **Go API → AI Service:** 60-second timeout, 2 retries on 5xx
- **AI Service → Anthropic API:** 120-second timeout, exponential backoff

## Monitoring and Logging

### Log Aggregation

All services log to stdout/stderr. In production, logs are aggregated via:
- **Platform:** Vercel logs
- **Go API:** Cloud Run logs
- **AI Service:** Cloud Run logs
- **Database:** Supabase logs

### Key Metrics

- **Platform:** Page load time, wizard completion rate, error rate
- **Go API:** Order creation latency, payment success rate, AI generation latency
- **AI Service:** Claude API latency, content generation success rate, error rate
- **Database:** Query latency, connection pool utilization

## Security Considerations

### Authentication

- **Platform ↔ Go API:** JWT bearer tokens (issued by Go API auth endpoint)
- **Go API ↔ AI Service:** Internal service call (no auth, network isolation assumed)
- **All services ↔ Database:** Connection string with credentials in environment variables

### Secrets Management

All secrets are stored in environment variables and managed via:
- **Development:** `.env` files (never committed)
- **Production:** Cloud provider secrets manager (AWS Secrets Manager, GCP Secret Manager, or HashiCorp Vault)

### Data Privacy

- User input is encrypted in transit (HTTPS)
- Generated content is stored in encrypted database columns
- Payment data is handled by Stripe (PCI-DSS compliant)
- No user data is logged or cached outside the database

## Troubleshooting

### Platform cannot reach Go API

**Check:**
- `NEXT_PUBLIC_API_URL` is set correctly in `.env.local`
- Go API is running on port 8080
- Firewall allows traffic on port 8080

```bash
curl http://localhost:8080/health
```

### Go API cannot reach AI Service

**Check:**
- `AI_SERVICE_URL` is set correctly in `.env`
- AI Service is running on port 8000
- Firewall allows traffic on port 8000

```bash
curl http://localhost:8000/health
```

### AI Service cannot reach Anthropic API

**Check:**
- `ANTHROPIC_API_KEY` is set correctly in `.env`
- API key is valid and has sufficient quota
- Network allows outbound HTTPS to api.anthropic.com

### Database connection errors

**Check:**
- `DATABASE_URL` is set correctly in `.env`
- Supabase project is running
- Database credentials are valid

```bash
psql $DATABASE_URL -c "SELECT 1"
```

## Further Reading

- [Platform README](platform/README.md) — Next.js setup and development
- [Go API README](api/README.md) — Go API setup and endpoints
- [AI Service README](ai-service/README.md) — Python AI Service setup and prompts
- [Contributing Guide](CONTRIBUTING.md) — Branch naming, PR process, TODO triage
- [Sprint Plan](SPRINT_N.md) — Current sprint goals and items
