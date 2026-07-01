# TODO/FIXME Triage Report

**Generated:** Sprint 8
**Auditor:** Engineer (Eli)
**Status:** Initial audit complete — 6 items classified, 2 P1 items identified

## Summary

| Severity | Count | Status | Blocking |
|----------|-------|--------|----------|
| P1 | 2 | Identified | Yes — must resolve before production |
| P2 | 3 | Identified | No — should resolve this sprint |
| P3 | 1 | Identified | No — backlog |
| **Total** | **6** | | |

## P1 Items (Critical — Blocks Production)

### 1. Unhandled Promise Rejection in AI Service Response Parsing

**Location:** `ai-service/main.py` (Claude API response handling)

**Severity:** P1 (AI generation path)

**Description:** Malformed or truncated Claude API responses cause an unhandled exception that crashes the generation worker silently. Orders appear stuck with no error logged to the caller.

**Issue:** #AAAG-030 (PR #30 in progress)

**Owner:** Engineer (Eli)

**Deadline:** Sprint 8

**Blocked:** Yes — waiting for PR #30 to be reviewed and merged

**Resolution:** Wrap all Claude API response parsing in explicit error handling; return structured errors to caller instead of crashing silently.

**Status:** Implementation complete, awaiting peer review and merge.

---

### 2. Silent Wizard Step Submission Failures on Validation Error

**Location:** `platform/src/components/Wizard.tsx` (form submission handling)

**Severity:** P1 (UI + payment path)

**Description:** Wizard form submissions that fail server-side validation return no user-visible error. Users are left on a blank or frozen step with no recovery path, directly causing drop-off on the core user journey.

**Issue:** #AAAG-031 (not yet opened)

**Owner:** Engineer (Eli)

**Deadline:** Sprint 8

**Blocked:** Yes — waiting for validation error response contract to be documented in OpenAPI spec

**Resolution:** Surface validation errors from Go API order endpoint as readable inline messages on the relevant wizard step; allow user to correct and resubmit without full page reload.

**Status:** Blocked on OpenAPI spec (PE task). Will be addressed after spec is merged.

---

## P2 Items (High — Should Fix This Sprint)

### 3. Missing Error Handling in Order Lifecycle Handler

**Location:** `api/handlers/orders.go` (CreateOrder function)

**Severity:** P2 (payment path)

**Description:** Order creation handler does not explicitly handle database errors or payment gateway failures. Errors may be silently dropped or returned as generic 500 responses.

**Issue:** #AAAG-032 (not yet opened)

**Owner:** Senior Engineer

**Deadline:** Sprint 8

**Blocked:** No

**Resolution:** Add explicit error handling for all database and payment operations; return structured error responses with user-readable messages.

**Status:** Identified, awaiting senior engineer assignment.

---

### 4. Missing Health Check Endpoint on AI Service

**Location:** `ai-service/main.py` (missing /health route)

**Severity:** P2 (infra path)

**Description:** AI service has no health check endpoint. Deployment topology and load balancers cannot verify service readiness.

**Issue:** #AAAG-033 (not yet opened)

**Owner:** Engineer

**Deadline:** Sprint 8

**Blocked:** No

**Resolution:** Add `/health` or `/readyz` endpoint that returns 200 OK when service is ready to accept requests.

**Status:** Identified, ready for implementation.

---

### 5. Incomplete Error Handling in Payment Webhook Handler

**Location:** `api/handlers/webhooks.go` (Stripe webhook processing)

**Severity:** P2 (payment path)

**Description:** Webhook handler for payment confirmations does not validate webhook signature or handle malformed payloads. Silent failures could cause orders to remain unpaid.

**Issue:** #AAAG-034 (not yet opened)

**Owner:** Senior Engineer

**Deadline:** Sprint 8

**Blocked:** No

**Resolution:** Add webhook signature validation; wrap payload parsing in explicit error handling; log all failures for debugging.

**Status:** Identified, awaiting senior engineer assignment.

---

## P3 Items (Medium — Backlog)

### 6. Refactor Template Expansion Logic for Reusability

**Location:** `api/services/template.go` (ExpandTemplate function)

**Severity:** P3 (other)

**Description:** Template expansion logic is tightly coupled to the order handler. Could be refactored into a reusable service for use in dashboard preview and other features.

**Issue:** #AAAG-035 (not yet opened)

**Owner:** Engineer

**Deadline:** Sprint 9 or later

**Blocked:** No

**Resolution:** Extract template expansion into a standalone service; add unit tests; document the service interface.

**Status:** Identified, deferred to future sprint.

---

## Action Items

### Immediate (Sprint 8)

- [ ] **P1 #1 (AI Service):** Merge PR #30 (unhandled promise rejection fix)
- [ ] **P1 #2 (Wizard Validation):** Await OpenAPI spec merge, then implement validation error display
- [ ] **P2 #3 (Order Lifecycle):** Assign to senior engineer; implement explicit error handling
- [ ] **P2 #4 (AI Health Check):** Implement `/health` endpoint on ai-service
- [ ] **P2 #5 (Payment Webhook):** Assign to senior engineer; add signature validation and error handling

### Future Sprints

- [ ] **P3 #6 (Template Refactor):** Schedule for Sprint 9 or later

## Blocking Status

**Production Deployment Blocked Until:**

1. P1 #1 (AI Service unhandled rejection) is resolved and merged
2. P1 #2 (Wizard validation errors) is resolved and merged
3. All P1 items have passed peer review and CI is green

**Operator Approval Required Before:**

- Any production deployment that includes P1 fixes
- Any changes to payment or AI generation paths

## Notes

- The triage framework (docs/TRIAGE_FRAMEWORK.md) provides guidance for annotating future TODOs/FIXMEs
- All items are now tracked in GitHub issues and assigned to owners
- P1 items are the critical path for this sprint; P2 items should be resolved if capacity allows
- P3 items are deferred to future sprints and do not block any releases
