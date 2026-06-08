# Local Development Setup for AaaG

This guide walks you through setting up the complete AaaG development environment locally. AaaG consists of three services that must run together:

- **platform/** — Next.js 14 frontend (port 3000)
- **api/** — Go API server (port 8080)
- **ai-service/** — Python FastAPI service (port 8000)
- **supabase/** — PostgreSQL database

## Prerequisites

Before you start, ensure you have the following installed:

### Required
- **Node.js** 18.17 or later (for platform/)
- **Go** 1.21 or later (for api/)
- **Python** 3.10 or later (for ai-service/)
- **Docker** and **Docker Compose** (for running Supabase and all services together)
- **Git** (for cloning and managing branches)

### Recommended
- **direnv** — for automatic .env loading (optional but helpful)
- **make** — for running common commands (optional)

### Verify Your Setup

```bash
node --version      # Should be v18.17.0 or later
go version          # Should be go1.21 or later
python --version    # Should be 3.10 or later
docker --version    # Should be Docker 20.10 or later
docker-compose --version  # Should be 2.0 or later
```

## Quick Start with Docker Compose

The fastest way to get all services running is with docker-compose:

```bash
# Clone the repository
git clone <repo-url>
cd AaaG

# Copy environment templates
cp ai-service/.env.example ai-service/.env
cp api/.env.example api/.env
cp platform/.env.example platform/.env

# Edit .env files and add required secrets (see .env Configuration section below)
# Then start all services:
docker-compose up
```

This single command will:
1. Start the PostgreSQL database (Supabase)
2. Run database migrations
3. Start the Python ai-service on port 8000
4. Start the Go api on port 8080
5. Start the Next.js platform on port 3000

Once all services are running, open http://localhost:3000 in your browser.

To stop all services:
```bash
docker-compose down
```

## Manual Service Startup (Without Docker Compose)

If you prefer to run services individually, follow these steps in order:

### 1. Database Setup (Supabase)

You have two options:

**Option A: Use Supabase Cloud (Recommended for Development)**

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. In the SQL editor, run the migrations from `supabase/migrations/001_init.sql`
4. Copy your database connection string and add it to your `.env` files

**Option B: Run Supabase Locally**

```bash
# Start Supabase locally (requires Docker)
docker-compose up supabase

# In another terminal, run migrations
psql postgresql://postgres:postgres@localhost:5432/postgres < supabase/migrations/001_init.sql
```

### 2. AI Service (Python FastAPI)

```bash
cd ai-service

# Create a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy and configure .env
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# Start the service
uvicorn main:app --reload --port 8000
```

The service will be available at http://localhost:8000. API docs are at http://localhost:8000/docs.

### 3. Go API Server

```bash
cd api

# Copy and configure .env
cp .env.example .env
# Edit .env and add required keys (see .env Configuration section)

# Download dependencies
go mod tidy

# Start the server
go run ./cmd/server
```

The API will be available at http://localhost:8080.

### 4. Next.js Platform

```bash
cd platform

# Copy and configure .env
cp .env.example .env
# Edit .env and add required keys

# Install dependencies
npm install

# Start the development server
npm run dev
```

The platform will be available at http://localhost:3000.

## .env Configuration

Each service requires environment variables to run. Templates are provided as `.env.example` files.

### General Pattern

```bash
cd <service-directory>
cp .env.example .env
# Edit .env with your actual values
```

### Required Secrets

**ai-service/.env**
- `ANTHROPIC_API_KEY` — Your Anthropic API key (get from [console.anthropic.com](https://console.anthropic.com))
- `DATABASE_URL` — PostgreSQL connection string (from Supabase)

**api/.env**
- `DATABASE_URL` — PostgreSQL connection string (from Supabase)
- `STRIPE_SECRET_KEY` — Stripe API key (get from [stripe.com](https://stripe.com))
- `STRIPE_WEBHOOK_SECRET` — Webhook signing secret from Stripe dashboard
- `JWT_SECRET` — A random string for signing JWTs (generate with `openssl rand -base64 32`)

**platform/.env**
- `NEXT_PUBLIC_API_URL` — URL of the Go API (http://localhost:8080 for local dev)
- `NEXT_PUBLIC_STRIPE_KEY` — Stripe publishable key (from Stripe dashboard)

### Using direnv (Optional)

If you have [direnv](https://direnv.net/) installed, you can automate .env loading:

```bash
# In the repo root, create a .envrc file:
echo 'export $(cat .env | xargs)' > .envrc

# Allow direnv to load it:
direnv allow

# Now .env variables are automatically loaded when you cd into the directory
```

## Running CI Checks Locally

Before pushing your changes, run the same checks that CI will run:

### Platform (Next.js)

```bash
cd platform

# Install dependencies
npm install

# Run linting
npm run lint

# Run type checking
npm run type-check

# Build the project
npm run build
```

### API (Go)

```bash
cd api

# Format code
go fmt ./...

# Run linter (if configured)
go vet ./...

# Run tests
go test ./...
```

### AI Service (Python)

```bash
cd ai-service

# Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run import smoke test
python -c "import main; print('✓ Imports successful')"

# Run any configured tests
pytest  # if tests exist
```

## Troubleshooting

### Port Already in Use

If you see "port X already in use" errors:

```bash
# Find what's using the port (macOS/Linux)
lsof -i :3000  # for port 3000

# Kill the process
kill -9 <PID>

# Or use a different port:
NEXT_PUBLIC_PORT=3001 npm run dev  # for platform
GO_PORT=8081 go run ./cmd/server   # for api
PYTHON_PORT=8001 uvicorn main:app --port 8001  # for ai-service
```

### Database Connection Errors

If you see "cannot connect to database" errors:

1. Verify Supabase is running: `docker-compose ps` should show supabase container as "Up"
2. Check your `DATABASE_URL` in `.env` files matches your Supabase connection string
3. Ensure migrations have been run: `psql <DATABASE_URL> < supabase/migrations/001_init.sql`

### Python Virtual Environment Issues

If you see "command not found: python" or import errors:

```bash
cd ai-service

# Recreate the virtual environment
rm -rf venv
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Node Modules Issues

If you see "cannot find module" errors:

```bash
cd platform

# Clear npm cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Docker Compose Won't Start

If `docker-compose up` fails:

```bash
# Check Docker is running
docker ps

# View detailed logs
docker-compose up --verbose

# Rebuild images
docker-compose build --no-cache
```

## Next Steps

Once your local environment is running:

1. **Read the Architecture** — See [docs/ARCHITECTURE.md](ARCHITECTURE.md) for the full technical plan
2. **Check the Sprint Plan** — See [SPRINT_N.md](../SPRINT_N.md) for current work items
3. **Review Contributing Guidelines** — See [CONTRIBUTING.md](../CONTRIBUTING.md) for branch naming and PR process
4. **Explore the Code** — Start with `platform/app/page.tsx` for the landing page

## Getting Help

- **Questions about setup?** Check the Troubleshooting section above
- **Questions about the codebase?** See [docs/ARCHITECTURE.md](ARCHITECTURE.md)
- **Questions about contributing?** See [CONTRIBUTING.md](../CONTRIBUTING.md)
- **Found a bug?** Open an issue or create a PR following the branch naming convention

## Environment Variables Reference

For a complete list of all environment variables used by each service, see the `.env.example` files:

- `ai-service/.env.example`
- `api/.env.example`
- `platform/.env.example`

Each file is documented with comments explaining what each variable does and where to get the value.
