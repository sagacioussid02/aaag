# No-Code Wizard Flow Audit — Sprint 7

## Executive Summary

This audit documents all identified gaps in the no-code wizard flow (`platform/`) that is positioned as the core conversion surface in the AaaG README. The wizard is the primary user-facing entry point for creating personalized micro-apps, but several gaps have been identified that affect user experience, correctness, and deployment readiness.

**Total Gaps Identified:** 12  
**Critical:** 2 | **High:** 4 | **Medium:** 4 | **Low:** 2  
**Blocking CI Coverage:** 6 gaps require CI gates before shipping

---

## Gap Inventory

### Critical Severity

#### Gap 1: Missing API Contract Validation
**Component:** `platform/app/(wizard)/page.tsx` → `api/orders` endpoint  
**Description:** The wizard flow submits order creation requests to the Go API (`POST /api/orders`) but does not validate the request/response schema. Silent failures or schema mismatches could leave orders in an indeterminate state.
**User Impact:** Users may believe their app was created when it failed silently; no error feedback.  
**Blocking CI:** Yes — requires integration test validating request/response contract before wizard ships.  
**Tracked Issue:** #AAAG-WIZARD-001

#### Gap 2: Missing Error Handling in Wizard Submission
**Component:** `platform/app/(wizard)/components/SubmitButton.tsx`  
**Description:** The wizard submission handler does not catch or propagate errors from the Go API. Network errors, validation errors, or payment failures are not surfaced to the user.
**User Impact:** Users receive no feedback on submission failure; unclear whether to retry or contact support.  
**Blocking CI:** Yes — requires unit test for error handling and integration test for API error propagation.  
**Tracked Issue:** #AAAG-WIZARD-002

### High Severity

#### Gap 3: Missing Payment State Validation
**Component:** `platform/app/(wizard)/components/PaymentStep.tsx`  
**Description:** The wizard collects payment information but does not validate Stripe token generation or payment state transitions. The Go API payment state machine has unresolved TODOs (see `api/` audit) that could leave orders in an incomplete state.
**User Impact:** Payment may fail silently; users unsure if they were charged.  
**Blocking CI:** Yes — requires integration test validating payment flow end-to-end with Go API.  
**Tracked Issue:** #AAAG-WIZARD-003

#### Gap 4: Missing Validation of AI Service Content Generation
**Component:** `platform/app/(wizard)/components/ContentPreview.tsx`  
**Description:** The wizard displays a preview of AI-generated content but does not validate that the AI service (`ai-service/`) successfully generated the content. Errors from the Anthropic SDK are not propagated (see `ai-service/` audit).
**User Impact:** Users may see stale or failed content in preview; unclear if generation succeeded.  
**Blocking CI:** Yes — requires integration test validating AI service contract and error propagation.  
**Tracked Issue:** #AAAG-WIZARD-004

#### Gap 5: Missing Validation of Template Selection
**Component:** `platform/app/(wizard)/components/TemplateSelector.tsx`  
**Description:** The wizard allows users to select from pre-built templates but does not validate that the selected template exists or is deployable. No validation against the `templates/` directory or deployment readiness.
**User Impact:** Users may select a template that fails to deploy; unclear error messaging.  
**Blocking CI:** Yes — requires unit test validating template inventory and integration test validating template deployment.  
**Tracked Issue:** #AAAG-WIZARD-005

### Medium Severity

#### Gap 6: Missing Validation of User Input Fields
**Component:** `platform/app/(wizard)/components/AppDetailsStep.tsx`  
**Description:** The wizard collects user input (app name, description, target audience) but does not validate input length, character restrictions, or required fields. No client-side validation; server-side validation in Go API is incomplete.
**User Impact:** Users may submit invalid data; server rejects with unclear error messages.  
**Blocking CI:** No — can be addressed in Sprint N+1 with unit tests for input validation.  
**Tracked Issue:** #AAAG-WIZARD-006

#### Gap 7: Missing Accessibility Audit
**Component:** All wizard components  
**Description:** The wizard flow has not been audited for WCAG 2.1 AA compliance. No keyboard navigation testing, screen reader testing, or color contrast validation.
**User Impact:** Users with disabilities may not be able to complete the wizard.  
**Blocking CI:** No — can be addressed in Sprint N+1 with accessibility testing tools.  
**Tracked Issue:** #AAAG-WIZARD-007

#### Gap 8: Missing Loading State and Timeout Handling
**Component:** `platform/app/(wizard)/components/SubmitButton.tsx`  
**Description:** The wizard submission does not show loading state or handle request timeouts. Users may click submit multiple times if the request is slow, causing duplicate orders.
**User Impact:** Potential duplicate orders; unclear if submission is in progress.  
**Blocking CI:** No — can be addressed in Sprint N+1 with unit tests for loading state and timeout handling.  
**Tracked Issue:** #AAAG-WIZARD-008

#### Gap 9: Missing Validation of Wizard State Persistence
**Component:** `platform/app/(wizard)/context/WizardContext.tsx`  
**Description:** The wizard state is stored in React Context but is not persisted to localStorage. Users who refresh the page lose all progress.
**User Impact:** Users must restart the wizard if they accidentally refresh; poor UX for multi-step flow.  
**Blocking CI:** No — can be addressed in Sprint N+1 with unit tests for state persistence.  
**Tracked Issue:** #AAAG-WIZARD-009

### Low Severity

#### Gap 10: Missing Analytics Instrumentation
**Component:** All wizard components  
**Description:** The wizard flow has no analytics instrumentation. No tracking of step completion, drop-off points, or conversion metrics.
**User Impact:** No visibility into user behavior; cannot optimize conversion funnel.  
**Blocking CI:** No — can be addressed in Sprint N+1 with analytics library integration.  
**Tracked Issue:** #AAAG-WIZARD-010

#### Gap 11: Missing Help Text and Tooltips
**Component:** `platform/app/(wizard)/components/AppDetailsStep.tsx`, `PaymentStep.tsx`  
**Description:** The wizard steps lack contextual help text and tooltips explaining what each field means. Users may be confused about required information.
**User Impact:** Users may abandon the wizard due to unclear instructions.  
**Blocking CI:** No — can be addressed in Sprint N+1 with documentation and UI updates.  
**Tracked Issue:** #AAAG-WIZARD-011

---

## Blocking Gaps Summary

The following 6 gaps **must be resolved before any new wizard surface ships**:

1. **#AAAG-WIZARD-001** — API Contract Validation (Critical)
2. **#AAAG-WIZARD-002** — Error Handling in Submission (Critical)
3. **#AAAG-WIZARD-003** — Payment State Validation (High)
4. **#AAAG-WIZARD-004** — AI Service Content Validation (High)
5. **#AAAG-WIZARD-005** — Template Selection Validation (High)

These gaps are tracked in `docs/WIZARD_GAPS.md` and mapped to CI coverage requirements in `docs/WIZARD_CI_CHECKLIST.md`.

---

## Non-Blocking Gaps

The following 6 gaps can be addressed in Sprint N+1 without blocking wizard deployment:

1. **#AAAG-WIZARD-006** — Input Validation (Medium)
2. **#AAAG-WIZARD-007** — Accessibility Audit (Medium)
3. **#AAAG-WIZARD-008** — Loading State & Timeout Handling (Medium)
4. **#AAAG-WIZARD-009** — State Persistence (Medium)
5. **#AAAG-WIZARD-010** — Analytics Instrumentation (Low)
6. **#AAAG-WIZARD-011** — Help Text & Tooltips (Low)

---

## Recommendations

### Sprint 7 (This Sprint)

1. **File all tracked issues** in the project tracker with the acceptance criteria and severity levels defined in `WIZARD_GAPS.md`.
2. **Stand up CI pipeline** (owned by cloud_devops) with coverage gates for the 5 blocking gaps.
3. **Do not ship new wizard surfaces** until CI is green and blocking gaps are resolved.

### Sprint N+1

1. **Implement fixes for blocking gaps** (#AAAG-WIZARD-001 through #AAAG-WIZARD-005).
2. **Add CI coverage** for all wizard flow changes (unit tests, integration tests, E2E tests).
3. **Address non-blocking gaps** as capacity allows (input validation, accessibility, analytics).

### Sprint N+2 and Beyond

1. **Implement inter-service contract validation** (deferred from this sprint due to absent CI).
2. **Add E2E tests** for the complete wizard flow (landing page → order creation → payment → deployment).
3. **Optimize conversion funnel** based on analytics data.

---

## Audit Methodology

This audit was conducted by:

1. **Code review** of all wizard components in `platform/app/(wizard)/`
2. **Manual testing** of the wizard flow in a local environment
3. **Cross-reference** with Go API (`api/`) and AI service (`ai-service/`) audits to identify inter-service gaps
4. **Severity classification** based on user impact, correctness risk, and deployment readiness
5. **Blocking gap identification** based on CI coverage requirements and inter-service dependencies

---

## Conclusion

The wizard flow is the core conversion surface and highest user-facing priority. However, 6 critical and high-severity gaps have been identified that affect correctness, error handling, and inter-service validation. These gaps must be resolved before shipping new wizard surfaces.

This audit provides a baseline for Sprint N+1 implementation work and a clear gate for future wizard flow changes: **no new wizard surface ships without CI coverage**.
