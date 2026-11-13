# AaaG AI Service (Python + FastAPI)

Claude-powered content generation for personalized micro-apps.

## Tech

- **Language**: Python 3.11+
- **Framework**: FastAPI
- **Server**: Uvicorn
- **Port**: 8000
- **AI**: Anthropic Claude API

## Setup

### Prerequisites

- Python 3.11+
- pip

### Installation

```bash
cd ai-service
pip install -r requirements.txt
```

### Development

```bash
uvicorn main:app --reload --port 8000
```

Server starts on [http://localhost:8000](http://localhost:8000).

API docs available at [http://localhost:8000/docs](http://localhost:8000/docs).

## Environment Variables

Create a `.env` file (ignored by git):

```
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
```

See `.env.example` for all options.

## Build & Smoke Test (for CI)

```bash
# Install dependencies
pip install -r requirements.txt

# Verify main module imports (smoke test)
python -c "import main; print('✓ main module imports successfully')"
```

Both must pass in CI before merge.

## Project Structure

```
ai-service/
├── main.py                # FastAPI app and routes
├── requirements.txt       # Python dependencies
├── .env.example           # Template for environment variables
└── README.md              # This file
```

## API Endpoints

### POST /generate

Generate personalized app content via Claude.

```json
{
  "template_id": "greeting-card",
  "user_input": "Birthday card for my friend Alex",
  "context": { ... }
}
```

Returns:

```json
{
  "content": "Generated personalized content...",
  "metadata": { ... }
}
```

## Testing

```bash
pytest  # Run tests (when implemented)
```

## Deployment

Deployed via Cloud Run or similar managed service on every push to `main` (once CI is green).

## CI Integration

GitHub Actions:
1. Installs all dependencies via `pip install -r requirements.txt`
2. Runs import smoke test: `python -c "import main"`

Both must pass before merge.
