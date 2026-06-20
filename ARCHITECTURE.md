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
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                   Go API (Gin)                              │
│         Orders, payments, app lifecycle                     │
│                      Port: 8080                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ HTTP/REST
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              AI Service (FastAPI)                           │
│         Claude-powered content generation                   │
│                      Port: 8000                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ SDK calls
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              Anthropic API (external)                       │
│                  Claude models                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              Supabase (PostgreSQL)                          │
│         Shared database for all services                    │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### User Creates a Personalized App (Happy Path)

1. **Platform** → User fills out the no-code wizard and submits
2. **Platform** → POST `/api/orders` to **Go API** with user input and template selection
3. **Go API** → Validates order, creates order record in database, initiates payment flow
4. **Go API** → POST `/generate` to **AI Service** with user input and template context
5. **AI Service** → Calls Anthropic API to generate personalized content
6. **AI Service** → Returns generated content to **Go API**
7. **Go API** → Stores generated content in database, updates order status to `completed`
8. **Go API** → Returns order confirmation to **Platform**
9. **Platform** → Displays dashboard with the new app

### Error Handling

- **AI Service errors** (API connection, rate limit, auth, generic) are propagated to **Go API** with appropriate HTTP status codes (503, 429, 401, 500)
- **Go API** returns error responses to **Platform** with error type and status code for debugging
- **Platform** displays user-friendly error messages and retry prompts

## Inter-Service Request/Response Schema Baseline

### Platform ↔ Go API

#### POST /api/orders

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

### Go API ↔ AI Service

#### POST /generate

**Request:**
```json
{
  "prompt": "string (user input for content generation)",
  "template_context": "string (template-specific context)",
  "max_tokens": "integer (optional, default 1024, range 1-5000)"
}
```

**Response (Success, 200):**
```json
{
  "generated_content": "string (Claude-generated content)",
  "tokens_used": "integer (actual tokens consumed)",
  "model": "string (Claude model used, e.g., 'claude-3-sonnet-20240229')"
}
```

**Response (Error, 4xx/5xx):**
```json
{
  "error": "string (error type: APIConnectionError|RateLimitError|AuthenticationError|APIStatusError)",
  "message": "string (human-readable message)",
  "status_code": "integer"
}
```

## Local Development Setup

For complete setup instructions, see the README in each service directory:

- [ai-service/README.md](ai-service/README.md) — AI Service setup
- [api/README.md](api/README.md) — Go API setup
- [platform/README.md](platform/README.md) — Platform setup

All three services must be running for end-to-end testing. The platform wizard will fail if the Go API is unavailable, and the Go API will fail if the AI Service is unavailable.

## Build Order (MVP Phases)

- **Phase 0** — Landing page + waitlist (validate before building)
- **Phase 1** — Manual MVP: Google Form → you deploy by hand → Stripe payment link
- **Phase 2** — Automate: Go API + AI service + Vercel auto-deploy
- **Phase 3** — Full platform: dashboard, 4 templates, ProductHunt launch

Current sprint is focused on establishing CI infrastructure, auditing dependencies, and triaging technical debt to unblock Phase 2 and 3 work.

## Known Issues and Tracking

All TODO and FIXME annotations are tracked in the [triage framework](docs/TRIAGE_FRAMEWORK.md). The current triage report is available at [docs/TRIAGE_REPORT.md](docs/TRIAGE_REPORT.md).

Key items blocking Phase 2 completion:

- **Wizard flow audit** — Document all gaps and file tracked issues (see [platform/README.md](platform/README.md) for entry point)
- **Go API payment state machine** — Resolve incomplete transitions and add regression tests
- **AI Service error propagation** — Ensure all Anthropic SDK errors are correctly returned to caller
- **CI pipeline** — Stand up GitHub Actions for all three services

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for branch naming, PR process, and TODO/FIXME triage framework.
