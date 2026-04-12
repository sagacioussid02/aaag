# AaaG — Apps As A Gift
## MVP Architecture & Plan

---

## The One-liner

> A marketplace where non-technical people get personalized, ephemeral micro-apps
> delivered in minutes — like Etsy, but you're gifting software.

---

## Tech Stack

| Layer            | Technology          | Why                                                   |
|------------------|---------------------|-------------------------------------------------------|
| Platform UI      | Next.js 14 (TS)     | You know it. SSR + API routes. Perfect for SaaS UI.   |
| Backend API      | Go + Gin            | Fast, low memory, concurrent app-generation jobs      |
| AI Service       | Python FastAPI      | You know it. Claude API is first-class in Python.     |
| Database + Auth  | Supabase            | You already use it. Auth + Postgres + Storage built in|
| Payments         | Stripe              | Industry standard. One-time + subscriptions both      |
| Micro-app host   | Vercel API          | Deploy Next.js apps via API call. Subdomain routing.  |
| Email            | Resend              | Simple API, great DX, cheap                           |
| Background jobs  | Go goroutines +     | Expiry checks, cleanup jobs — no extra infra needed   |
|                  | pg_cron (Supabase)  |                                                       |

---

## Folder Structure

```
AaaG/
├── platform/              # Main website — Next.js 14
│   ├── app/
│   │   ├── page.tsx               # Landing page
│   │   ├── templates/             # Template gallery
│   │   │   └── page.tsx
│   │   ├── customize/[templateId] # Customization wizard
│   │   │   └── page.tsx
│   │   ├── checkout/              # Stripe payment
│   │   │   └── page.tsx
│   │   ├── dashboard/             # User's active apps
│   │   │   └── page.tsx
│   │   └── api/                   # Next.js API routes (thin, proxy to Go)
│   ├── components/
│   │   ├── TemplateCard.tsx
│   │   ├── CustomizationForm.tsx
│   │   ├── PricingCard.tsx
│   │   └── AppPreview.tsx
│   └── lib/
│       ├── supabase.ts
│       └── stripe.ts
│
├── api/                   # Go backend — core business logic
│   ├── cmd/server/
│   │   └── main.go
│   ├── internal/
│   │   ├── handlers/
│   │   │   ├── apps.go            # CRUD for generated apps
│   │   │   ├── orders.go          # Order processing
│   │   │   ├── templates.go       # Template management
│   │   │   └── webhooks.go        # Stripe webhooks
│   │   ├── services/
│   │   │   ├── generator.go       # Orchestrates app generation
│   │   │   ├── deployer.go        # Vercel API calls
│   │   │   ├── expiry.go          # Cron: marks/deletes expired apps
│   │   │   └── notifier.go        # Sends email via Resend
│   │   ├── models/
│   │   │   ├── app.go
│   │   │   ├── order.go
│   │   │   └── template.go
│   │   └── db/
│   │       └── supabase.go        # Postgres client
│   └── go.mod
│
├── ai-service/            # Python FastAPI — AI content generation
│   ├── main.py
│   ├── routers/
│   │   ├── recipe.py              # Recipe app content generator
│   │   ├── travel.py              # Travel itinerary generator
│   │   ├── game.py                # Trip game content generator
│   │   └── event.py               # Event app generator
│   ├── core/
│   │   ├── claude.py              # Claude API wrapper
│   │   └── prompts.py             # All prompt templates
│   └── requirements.txt
│
└── templates/             # Pre-built Next.js micro-app templates
    ├── recipe-app/        # Template 1: Personal recipe/food app
    ├── travel-planner/    # Template 2: Group travel itinerary
    ├── trip-game/         # Template 3: Multiplayer trip game (Pictionary etc.)
    └── event-app/         # Template 4: Event RSVP + info app
```

---

## Database Schema (Supabase / Postgres)

```sql
-- Who bought
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  name        TEXT,
  stripe_customer_id TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- What can be bought
CREATE TABLE templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,   -- 'recipe-app', 'travel-planner'
  name        TEXT NOT NULL,
  description TEXT,
  category    TEXT,                   -- 'gift', 'travel', 'event', 'game'
  preview_url TEXT,
  config_schema JSONB,               -- form fields schema (JSON Schema)
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- What they paid for
CREATE TABLE orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES users(id),
  template_id      UUID REFERENCES templates(id),
  plan_type        TEXT NOT NULL,     -- 'spark', 'moment', 'keep'
  amount_cents     INTEGER NOT NULL,
  stripe_payment_id TEXT,
  status           TEXT DEFAULT 'pending', -- pending | paid | failed
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- The generated app
CREATE TABLE apps (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID REFERENCES orders(id),
  subdomain    TEXT UNIQUE NOT NULL,  -- recipe-xyz123.aaag.com
  vercel_deployment_id TEXT,
  config       JSONB NOT NULL,        -- user's customization answers
  ai_content   JSONB,                 -- Claude-generated content
  status       TEXT DEFAULT 'generating', -- generating | live | expired | deleted
  expires_at   TIMESTAMPTZ,           -- NULL = forever (Keep plan)
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Plan Tiers

| Plan    | Price     | Duration | Users    | Best for                        |
|---------|-----------|----------|----------|---------------------------------|
| Spark   | $9.99     | 30 days  | up to 5  | Birthday gift, surprise         |
| Moment  | $24.99    | 90 days  | up to 20 | Group trip, family event        |
| Keep    | $4.99/mo  | Forever  | Unlimited| Ongoing hobby app, family tool  |
| Gift    | $14.99    | 60 days  | up to 10 | Gifted to someone else entirely |

---

## API Endpoints (Go)

```
POST /api/orders                    → Create order + Stripe checkout session
POST /api/webhooks/stripe           → Handle payment confirmation
GET  /api/apps/:id                  → Get app status + link
GET  /api/apps/user/:userId         → List user's apps
POST /api/apps/:id/extend           → Extend plan
DELETE /api/apps/:id                → Delete app

GET  /api/templates                 → List active templates
GET  /api/templates/:slug           → Get template + config schema

POST /internal/generate             → (AI service) Generate app content
POST /internal/deploy               → Deploy to Vercel
POST /internal/expire               → (cron) Mark/delete expired apps
```

---

## App Generation Flow (The Core Pipeline)

```
User pays (Stripe)
    │
    ▼
Stripe webhook → Go API
    │
    ├─► Create order record (status: paid)
    ├─► Create app record (status: generating)
    │
    ├─► Call AI Service (Python/Claude)
    │       └─► Generate personalized content based on user answers
    │           └─► e.g. 50 curated recipes, custom trip itinerary
    │
    ├─► Inject config + AI content into template (JSON config file)
    │
    ├─► Call Vercel API → deploy template with that config
    │       └─► Get deployment URL → map to subdomain
    │
    ├─► Update app record (status: live, subdomain set, expires_at set)
    │
    └─► Send email via Resend → "Your app is ready! 🎁"
                                  Link: recipe-sarah.aaag.com
```

---

## How Templates Work

Each template in `/templates/` is a standalone Next.js app that reads from a
`config.json` at build time (or fetched from Supabase at runtime).

```json
// Example config for recipe-app
{
  "app_name": "Sarah's Kitchen",
  "owner_name": "Sarah",
  "theme": "warm-rose",
  "greeting": "Made with love for you 🍳",
  "recipes": [
    { "title": "Grandma's Lasagna", "ingredients": [...], "steps": [...] },
    ...
  ]
}
```

The template renders this config. Same code, infinite personalization.

When Vercel deploys, it passes `NEXT_PUBLIC_APP_CONFIG` env var pointing to the
config stored in Supabase Storage. Template fetches it on first load.

---

## User Flow (Step by Step)

### Buyer Journey

```
1. LAND on aaag.com
   └── Hero: "Gift a personalized app. In minutes."
   └── Sees 4 template cards: Recipe, Trip, Game, Event

2. PICK a template
   └── Click "Customize This" on Recipe App

3. CUSTOMIZE (wizard, 3-5 questions)
   └── "Who is this for?" → Sarah
   └── "What cuisines does she love?" → Italian, Indian
   └── "Pick a theme color" → Warm Rose
   └── "Add a personal message" → "Happy Birthday! ❤️"
   └── "How long?" → 30 days (Spark - $9.99)

4. PREVIEW
   └── AI generates a sample screen instantly (not full deploy, just a mock)
   └── "Looks good! Pay now" button

5. PAY
   └── Stripe checkout (one-time for Spark/Moment/Gift, subscription for Keep)

6. WAIT (~2-3 minutes)
   └── Progress screen: "We're baking Sarah's app..."
   └── Email arrives: "Sarah's Kitchen is ready!"

7. SHARE
   └── Copy link: recipe-sarah-abc123.aaag.com
   └── "Send this link to Sarah" — works on phone browser, installable as PWA
```

### Recipient Journey

```
1. Gets a link: recipe-sarah-abc123.aaag.com
2. Opens in browser on phone
3. Banner: "Install this app on your phone" (PWA prompt)
4. Has their personalized app — feels like a real app
5. App expires on set date (banner warns 7 days before)
```

---

## Landing Page Structure

```
HERO
─────────────────────────────────────────────
  "Gift someone a personalized app.
   No code. No contracts. Ready in minutes."

  [See Templates →]          [How it works ↓]

  Preview: animated mockup of a recipe app on a phone

─────────────────────────────────────────────
TEMPLATES (4 cards)

  🍳 Recipe App          ✈️ Travel Planner
  "A personalized cookbook  "Your family's private
   just for her"             AI trip companion"
  From $9.99              From $14.99

  🎮 Trip Game           🎉 Event App
  "Pictionary for your     "Invites, RSVP, and
   road trip"               memories in one place"
  From $9.99              From $9.99

─────────────────────────────────────────────
HOW IT WORKS (3 steps)

  1. Choose a template
  2. Answer a few questions (takes 3 minutes)
  3. Share the link — it works like a real app

─────────────────────────────────────────────
PRICING

  Spark $9.99    Moment $24.99    Keep $4.99/mo
  30 days        90 days          Forever
  5 users        20 users         Unlimited

─────────────────────────────────────────────
SOCIAL PROOF (once you have it)

  "I gifted my wife a recipe app for her birthday.
   She thought I hired a developer." — Real quote

─────────────────────────────────────────────
FAQ

  Does the recipient need to download anything? No.
  What happens when it expires? We warn you 7 days ahead.
  Can I extend my plan? Yes, from your dashboard.
  Is my data private? Yes. Only people with the link see it.

─────────────────────────────────────────────
FOOTER: About | Pricing | Contact | Terms | Privacy
```

---

## MVP Build Order (Phases)

### Phase 0 — Validate Before Building (Week 1-2)
- Put up a landing page (can be a simple HTML page)
- "Get early access" email form
- Post on Reddit: r/gifts, r/SideProject, r/Entrepreneur
- Goal: 50 email signups before writing backend code

### Phase 1 — Manual MVP (Week 3-4)
- One template only (Recipe App)
- User fills Google Form → you manually deploy a Vercel project
- Charge via Stripe payment link (no code needed for payments either)
- Goal: 5 paying customers, even at $5

### Phase 2 — Automate Core (Month 2)
- Build Go API (orders + webhook + app record)
- Build AI service (Claude generates recipes based on form)
- Auto-deploy to Vercel via API
- Email via Resend
- Goal: end-to-end automated for Recipe App

### Phase 3 — Platform (Month 3)
- Build proper Next.js platform UI
- Add 2 more templates
- User dashboard
- Goal: launch on ProductHunt

### Phase 4 — Growth
- Clone/Share feature (recipient can clone template for $X)
- Template marketplace (third-party builders)
- Mobile app (if PWA isn't enough)

---

## Risks + Mitigations

| Risk                              | Mitigation                                          |
|-----------------------------------|-----------------------------------------------------|
| Nobody buys                       | Phase 0 validates before you build                  |
| AI content is bad quality         | Human review + iteration before full automation     |
| Vercel costs spike                | Cap concurrent deployments, use static export       |
| App Store pressure for "real app" | Lead with PWA — covers 90% of use cases             |
| Support overload                  | Self-serve FAQ, clear expiry emails, simple UX      |
| Someone builds same thing         | The "gift" angle + speed of iteration is your moat  |
