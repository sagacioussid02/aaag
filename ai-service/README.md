# AaaG AI Service

Python FastAPI service for Claude-powered content generation.

## Local Setup

### Prerequisites

- Python 3.10+
- pip or poetry
- Anthropic API key

### Installation

```bash
cd ai-service
pip install -r requirements.txt
```

### Environment Variables

Create a `.env` file in the `ai-service/` directory:

```bash
cp .env.example .env
```

Then update with your values:

```
# Anthropic API key (required)
ANTHROPIC_API_KEY=sk-ant-...

# Server port
PORT=8000

# Logging level
LOG_LEVEL=INFO

# Environment
ENVIRONMENT=development
```

**Important:** Do not commit `.env` to version control. Use `.env.example` to document required variables.

### Running Locally

```bash
uvicorn main:app --reload --port 8000
```

The API will start on http://localhost:8000.

API documentation is available at http://localhost:8000/docs (Swagger UI).

## API Endpoints

### Content Generation

#### POST /generate
Generate content using Claude based on app configuration.

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

For complete request/response schemas, see [ARCHITECTURE.md](../ARCHITECTURE.md#inter-service-request-response-schema-baseline).

## Project Structure

```
ai-service/
├── main.py                # FastAPI app entry point
├── models.py              # Pydantic models for request/response
├── services/
│   └── claude.py          # Claude API integration
├── handlers/              # Request handlers
├── middleware/            # HTTP middleware
├── requirements.txt       # Python dependencies
├── .env.example           # Environment variable template
└── README.md
```

## Claude Integration

The service uses the Anthropic Python SDK to call Claude:

1. Receives content generation request from Go API
2. Constructs prompt based on app configuration and customization
3. Calls Claude API with prompt
4. Parses Claude response and formats as HTML/JSX
5. Returns generated content to Go API

### Error Handling

The service properly handles and propagates Anthropic SDK errors:

- API key validation errors
- Rate limiting errors
- Network errors
- Invalid request errors

**Note:** Error propagation has known gaps (tracked as P0 bug). See [ARCHITECTURE.md](../ARCHITECTURE.md#known-gaps-and-tracked-issues).

## Testing

```bash
# Run tests
pytest

# Run tests with coverage
pytest --cov=.

# Run linting
flake8 .
pylint *.py
```

## Building

```bash
# Build Docker image
docker build -t aaag-ai-service .
```

## Deployment

The service is designed to deploy to Cloud Run or similar containerized environment:

```bash
# Build and push Docker image
docker build -t gcr.io/PROJECT_ID/aaag-ai-service .
docker push gcr.io/PROJECT_ID/aaag-ai-service

# Deploy to Cloud Run
gcloud run deploy aaag-ai-service --image gcr.io/PROJECT_ID/aaag-ai-service
```

Set environment variables in deployment:
- `ANTHROPIC_API_KEY` — Production Anthropic API key
- `PORT` — Server port (default: 8000)
- `LOG_LEVEL` — Logging level (default: INFO)

## Troubleshooting

### "Invalid API key"

Ensure `ANTHROPIC_API_KEY` is set correctly in `.env` and is a valid Anthropic API key.

### "Rate limit exceeded"

The service is hitting Anthropic API rate limits. Wait before retrying or upgrade your Anthropic plan.

### "Service not responding"

Ensure the service is running and accessible on the configured port.

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for branch naming, PR process, and code standards.
