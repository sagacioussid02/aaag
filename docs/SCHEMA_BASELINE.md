# Inter-Service Request/Response Schema Baseline

**Last Updated:** Sprint 7  
**Status:** Baseline (subject to change; full OpenAPI spec deferred to Sprint N+1)

This document captures the current request/response schemas for inter-service communication across AaaG's three-service topology. It serves as a reference point for future contract validation in CI and a foundation for next sprint's full OpenAPI spec authorship.

---

## Overview

AaaG consists of three services that communicate via HTTP:

```
┌─────────────┐         ┌──────────┐         ┌─────────────┐
│  Platform   │────────▶│   API    │────────▶│ AI Service  │
│ (Next.js)   │         │   (Go)   │         │  (Python)   │
└─────────────┘         └──────────┘         └─────────────┘
   Port 3000              Port 8080             Port 8000
```

### Service Responsibilities

- **Platform (Next.js):** Landing page, wizard UI, dashboard; initiates orders via API
- **API (Go):** Order management, payment processing, app lifecycle; delegates content generation to AI service
- **AI Service (Python):** Claude-powered content generation; called by API on behalf of orders

---

## Platform ↔ Go API

### Endpoint: `POST /api/orders`

**Purpose:** Create a new order from the wizard.

**Request:**
```json
{
  "template_id": "string (required)",
  "user_email": "string (required, email format)",
  "user_name": "string (required)",
  "customization": {
    "theme": "string (optional)",
    "content_prompt": "string (optional, user-provided prompt for AI generation)"
  },
  "payment_method": "string (required, enum: 'stripe', 'paypal')"
}
```

**Response (201 Created):**
```json
{
  "order_id": "string (UUID)",
  "status": "string (enum: 'pending', 'processing', 'completed', 'failed')",
  "template_id": "string",
  "user_email": "string",
  "created_at": "string (ISO 8601 timestamp)",
  "payment_url": "string (Stripe/PayPal checkout URL)"
}
```

**Error Response (400/500):**
```json
{
  "error": "string (error message)",
  "code": "string (error code, e.g., 'INVALID_TEMPLATE', 'PAYMENT_FAILED')"
}
```

---

### Endpoint: `GET /api/orders/{order_id}`

**Purpose:** Retrieve order status and details.

**Request:**
- Path parameter: `order_id` (UUID)
- Query parameters: none

**Response (200 OK):**
```json
{
  "order_id": "string (UUID)",
  "status": "string (enum: 'pending', 'processing', 'completed', 'failed')",
  "template_id": "string",
  "user_email": "string",
  "user_name": "string",
  "created_at": "string (ISO 8601 timestamp)",
  "updated_at": "string (ISO 8601 timestamp)",
  "payment_status": "string (enum: 'unpaid', 'paid', 'refunded')",
  "app_url": "string (deployed app URL, present if status == 'completed')"
}
```

**Error Response (404):**
```json
{
  "error": "Order not found",
  "code": "ORDER_NOT_FOUND"
}
```

---

### Endpoint: `POST /api/orders/{order_id}/payment-webhook`

**Purpose:** Receive payment confirmation from Stripe/PayPal (webhook).

**Request:**
```json
{
  "event_type": "string (enum: 'payment.success', 'payment.failed')",
  "order_id": "string (UUID)",
  "transaction_id": "string (Stripe/PayPal transaction ID)",
  "amount": "number (cents)",
  "currency": "string (ISO 4217 code, e.g., 'USD')",
  "timestamp": "string (ISO 8601 timestamp)"
}
```

**Response (200 OK):**
```json
{
  "status": "acknowledged"
}
```

**Error Response (400/500):**
```json
{
  "error": "string (error message)",
  "code": "string (error code)"
}
```

---

## Go API ↔ AI Service

### Endpoint: `POST /generate`

**Purpose:** Request Claude-powered content generation for an order.

**Request:**
```json
{
  "order_id": "string (UUID)",
  "template_id": "string",
  "user_prompt": "string (user-provided customization prompt)",
  "context": {
    "user_name": "string",
    "theme": "string (optional)"
  }
}
```

**Response (200 OK):**
```json
{
  "order_id": "string (UUID)",
  "generated_content": "string (HTML or markdown, depending on template)",
  "model": "string (Claude model used, e.g., 'claude-3-sonnet-20240229')",
  "tokens_used": {
    "input": "number",
    "output": "number"
  },
  "generated_at": "string (ISO 8601 timestamp)"
}
```

**Error Response (400/500):**
```json
{
  "error": "string (error message)",
  "code": "string (error code, e.g., 'INVALID_PROMPT', 'API_ERROR', 'RATE_LIMIT')",
  "details": "string (optional, additional context)"
}
```

---

### Endpoint: `GET /health`

**Purpose:** Health check for AI service availability.

**Request:**
- No body

**Response (200 OK):**
```json
{
  "status": "healthy",
  "service": "ai-service",
  "version": "string (semantic version)",
  "timestamp": "string (ISO 8601 timestamp)"
}
```

**Error Response (503):**
```json
{
  "status": "unhealthy",
  "service": "ai-service",
  "error": "string (error message)"
}
```

---

## Known Gaps & Future Work

### This Sprint (Sprint 7)
- ✅ Document current request/response schemas
- ✅ Establish baseline for inter-service contracts
- ✅ Identify data flow and dependencies

### Next Sprint (Sprint N+1)
- [ ] Author full OpenAPI 3.0 specification
- [ ] Add request/response validation in CI
- [ ] Document error codes and retry policies
- [ ] Add authentication/authorization schemas (JWT, API keys)
- [ ] Document rate limiting and timeout policies
- [ ] Add examples and test fixtures

### Known Issues

1. **No authentication documented:** Current schemas lack JWT/API key validation. Auth will be added in next sprint.
2. **Error codes not standardized:** Error responses use ad-hoc codes; standardization deferred to next sprint.
3. **No retry policy:** Transient failure handling and retry logic not documented.
4. **No rate limiting:** Rate limit headers and policies not yet specified.
5. **Silent breaking changes:** Changes to these schemas are not yet validated in CI; full contract validation deferred to next sprint.

---

## How to Use This Baseline

1. **For Development:** Use this document as a reference when implementing or modifying inter-service endpoints.
2. **For Code Review:** Verify that endpoint changes align with the documented schemas.
3. **For CI Integration:** This baseline will be used to generate automated contract validation tests in Sprint N+1.
4. **For Onboarding:** New team members can use this document to understand the three-service topology and data flow.

---

## Maintenance

When you modify an inter-service endpoint:
1. Update the corresponding schema in this document.
2. Note the change in the PR description.
3. Ensure backward compatibility or document breaking changes.
4. Link to the tracked issue (e.g., #AAAG-XXX) in the PR.

Once CI contract validation is in place (Sprint N+1), this document will be auto-generated from OpenAPI specs and kept in sync with the code.
