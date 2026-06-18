# AI Service

## Overview

The AI Service is a Python FastAPI application that provides Claude-powered content generation for personalized micro-apps. It wraps the Anthropic SDK and exposes a single `/generate` endpoint for the Go API to call.

## Local Setup

### Prerequisites

- Python 3.9+
- pip
- An Anthropic API key (get one at https://console.anthropic.com)

### Installation

```bash
cd ai-service

# Create a .env file with your Anthropic API key
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY value

# Install dependencies
pip install -r requirements.txt

# Run the service
uvicorn main:app --reload --port 8000
```

The service will be available at `http://localhost:8000`.

### Environment Variables

**Required:**
- `ANTHROPIC_API_KEY` — Your Anthropic API key (get from https://console.anthropic.com)

**Optional:**
- `UVICORN_HOST` — Host to bind to (default: `127.0.0.1`)
- `UVICORN_PORT` — Port to bind to (default: `8000`)

## API Contract

### POST /generate

Generate personalized content using Claude.

**Request:**
```json
{
  "prompt": "string (required, user input for content generation)",
  "template_context": "string (optional, template-specific context)",
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

### Error Handling

The service catches all Anthropic SDK exceptions and returns appropriate HTTP status codes:

- `503 Service Unavailable` — API connection error
- `429 Too Many Requests` — Rate limit exceeded
- `401 Unauthorized` — Authentication error (invalid API key)
- `500 Internal Server Error` — Generic API error

## Testing

### Unit Tests

```bash
# Run unit tests (no live API calls)
pytest test_main.py -v
```

Unit tests validate:
- Success path with proper SDK contract
- Input validation (empty prompts, whitespace, max_tokens bounds)
- Error propagation for all SDK exception types
- Mock-based isolation (no live API calls)

### Smoke Tests

```bash
# Run smoke tests (requires ANTHROPIC_API_KEY in environment)
pytest test_smoke.py -v -m smoke
```

Smoke tests validate the real SDK contract against the live Anthropic API. These tests are skipped if `ANTHROPIC_API_KEY` is not set.

## Architecture

See [ARCHITECTURE.md](../ARCHITECTURE.md) for the full service topology and data flow.

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for branch naming, PR process, and TODO/FIXME triage framework.
