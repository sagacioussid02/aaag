# TODO/FIXME Triage Framework

## Overview

This document defines the categorization schema for all TODO and FIXME annotations in the AaaG codebase. The framework enables consistent classification of technical debt, prioritization of fixes, and risk assessment for feature delivery.

**Current Status:** 254 TODO/FIXME items identified across the codebase (Sprint N triage phase).

---

## Categorization Dimensions

### 1. Severity Level

Each TODO/FIXME is assigned one of three severity levels:

| Level | Definition | Example | Action |
|-------|-----------|---------|--------|
| **Critical** | Blocks feature delivery, payment processing, or authentication. Fixes must be completed before integration tests or production deployment. | "TODO: validate JWT expiry before processing requests" | Fix in Sprint N+1 (after CI is green) |
| **High** | Impacts code quality, performance, or security but does not block feature delivery. Should be fixed within 2–3 sprints. | "TODO: add error handling for Stripe API timeout" | Fix in Sprint N+1 or N+2 |
| **Low** | Nice-to-have improvements, refactoring, or documentation. Can be deferred indefinitely if higher-priority work exists. | "TODO: extract magic number to constant" | Fix as capacity allows |

### 2. Path Type

Each TODO/FIXME is tagged by the code path it affects:

| Path Type | Definition | Examples | Risk |
|-----------|-----------|----------|------|
| **Payment** | Affects order processing, payment collection, or financial reconciliation. | Stripe integration, invoice generation, refund logic | 🔴 Highest — blocks revenue |
| **Auth** | Affects user authentication, authorization, or session management. | JWT validation, role-based access control, login flow | 🔴 Highest — blocks security |
| **Data** | Affects data integrity, persistence, or migration. | Database schema, validation, caching | 🟠 High — blocks reliability |
| **UI** | Affects user interface, accessibility, or user experience. | Form validation, error messages, responsive design | 🟡 Medium — blocks usability |
| **Infra** | Affects deployment, monitoring, logging, or infrastructure. | CI/CD, error tracking, performance monitoring | 🟡 Medium — blocks observability |
| **Other** | Miscellaneous improvements or refactoring. | Code style, documentation, test coverage | 🟢 Low — nice-to-have |

### 3. Service/File

Each TODO/FIXME is tagged with the service and file where it appears:

| Service | Location | Examples |
|---------|----------|----------|
| **api** | `api/cmd/`, `api/internal/`, `api/pkg/` | Go source files |
| **ai-service** | `ai-service/app/`, `ai-service/services/` | Python source files |
| **platform** | `platform/app/`, `platform/components/`, `platform/pages/` | TypeScript/React source files |
| **supabase** | `supabase/migrations/` | SQL migration files |
| **templates** | `templates/*/` | Template-specific source files |

---

## Triage Report Format

The triage report is a Markdown table or CSV file listing all TODO/FIXME items with the following columns:

```markdown
| ID | Service | File | Line | Severity | Path Type | Description | Blocked Until | Notes |
|----|---------|------|------|----------|-----------|-------------|---------------|-------|
| 1 | api | internal/payment/stripe.go | 42 | Critical | Payment | TODO: validate Stripe webhook signature | CI green | Blocks payment processing |
| 2 | api | internal/auth/jwt.go | 15 | Critical | Auth | TODO: implement JWT expiry check | CI green | Blocks auth flow |
| 3 | platform | components/OrderForm.tsx | 88 | High | UI | TODO: add error boundary for form submission | None | Can be fixed in N+1 |
| ... | ... | ... | ... | ... | ... | ... | ... | ... |
```

### Blocking Rules

**Critical items in payment or auth paths are blocked from fixing until:**
1. CI is green (Item 1 complete)
2. The TODO triage is complete (Item 3 complete)
3. The operator approves the fix plan for Sprint N+1

**Rationale:** Writing fixes against incomplete payment or auth logic risks encoding broken behavior as expected. The triage phase identifies all such items; fixes are then planned and executed with full visibility and CI safety.

---

## Adding New TODOs

When adding a new TODO or FIXME to the codebase, follow this format:

```go
// TODO(severity, path_type): brief description
// Blocked until: [condition, if applicable]
// Context: [additional context, if needed]
```

**Example (Go):**
```go
// TODO(critical, payment): validate Stripe webhook signature before processing
// Blocked until: CI is green and payment path is fully tested
// Context: Webhook spoofing risk; see Stripe docs on signature verification
func handleStripeWebhook(w http.ResponseWriter, r *http.Request) {
    // ...
}
```

**Example (Python):**
```python
# TODO(high, data): add database connection pooling for performance
# Context: Current implementation opens a new connection per request
async def get_db():
    # ...
```

**Example (TypeScript/React):**
```typescript
// TODO(low, ui): extract magic number to constant
// Context: MAX_RETRIES = 3 appears in three places
const handleSubmit = async () => {
    // ...
};
```

---

## Triage Workflow (Sprint N)

1. **Scan Phase** (Day 1–2)
   - Run `grep -r "TODO\|FIXME" --include="*.go" --include="*.py" --include="*.tsx" --include="*.ts" --include="*.jsx" --include="*.js" .` across all services.
   - Collect all matches with file path and line number.

2. **Categorization Phase** (Day 2–4)
   - For each TODO/FIXME, determine:
     - Severity (critical / high / low)
     - Path type (payment / auth / data / UI / infra / other)
     - Service and file
   - Flag critical items in payment/auth paths as "blocked until CI green".

3. **Report Phase** (Day 4–5)
   - Compile all items into a triage report (Markdown table or CSV).
   - Commit report to repo at `docs/TRIAGE_REPORT.md` or `docs/triage-report.csv`.
   - Link report from [CONTRIBUTING.md](../CONTRIBUTING.md) and [README.md](../README.md).
   - Report summary statistics to sprint review:
     - Total count: 254
     - Critical count: [X]
     - High count: [Y]
     - Low count: [Z]
     - Payment-path count: [A]
     - Auth-path count: [B]

---

## Risk Concentration Analysis

After triage is complete, the report will reveal:

- **Payment-path risk:** Count of critical/high TODOs in payment processing, invoicing, refunds, and reconciliation.
- **Auth-path risk:** Count of critical/high TODOs in authentication, authorization, and session management.
- **Data-path risk:** Count of critical/high TODOs in database schema, validation, and migrations.

These metrics inform the Sprint N+1 fix plan and integration test strategy.

---

## References

- [SPRINT_N.md](../SPRINT_N.md) — Sprint plan and triage phase details
- [CONTRIBUTING.md](../CONTRIBUTING.md) — Contributor guide with TODO format examples
