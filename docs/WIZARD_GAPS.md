# Wizard Flow Tracked Issues — Sprint 7

This document lists all tracked issues filed during the wizard flow audit. Each issue includes acceptance criteria, severity, owner assignment, and blocking status.

---

## Blocking Issues (Must Fix Before Shipping)

### #AAAG-WIZARD-001: API Contract Validation

**Severity:** Critical  
**Component:** `platform/app/(wizard)/page.tsx` → `api/orders` endpoint  
**Owner:** engineer (Sprint N+1)  
**Blocked Until:** CI is green with integration test coverage  

**Description:**
The wizard flow submits order creation requests to the Go API (`POST /api/orders`) but does not validate the request/response schema. Silent failures or schema mismatches could leave orders in an indeterminate state.

**Acceptance Criteria:**
- [ ] Document the current `POST /api/orders` request schema (required fields, types, constraints)
- [ ] Document the current `POST /api/orders` response schema (success and error cases)
- [ ] Add client-side validation in the wizard to match the documented schema
- [ ] Add integration test validating the wizard → Go API contract
- [ ] Integration test covers success case (order created) and error cases (validation error, server error)
- [ ] Integration test passes in CI pipeline

**Testing Approach:**
- Integration test: POST to `/api/orders` with valid and invalid payloads; verify response schema matches documented contract
- Manual testing: Submit wizard form with valid data; verify order is created in database
- Manual testing: Submit wizard form with invalid data; verify error is displayed to user

**Risk:** If not fixed, users may believe their app was created when it failed silently.

---

### #AAAG-WIZARD-002: Error Handling in Wizard Submission

**Severity:** Critical  
**Component:** `platform/app/(wizard)/components/SubmitButton.tsx`  
**Owner:** engineer (Sprint N+1)  
**Blocked Until:** CI is green with unit test and integration test coverage  

**Description:**
The wizard submission handler does not catch or propagate errors from the Go API. Network errors, validation errors, or payment failures are not surfaced to the user.

**Acceptance Criteria:**
- [ ] Add try-catch block in submission handler to catch API errors
- [ ] Propagate error messages to user via toast notification or error banner
- [ ] Add unit test for error handling (mock API error responses)
- [ ] Add integration test for error propagation (real API error scenarios)
- [ ] Unit test covers network error, validation error, and server error cases
- [ ] Integration test covers same error cases with real Go API
- [ ] Both tests pass in CI pipeline

**Testing Approach:**
- Unit test: Mock API errors; verify error handler catches and displays error
- Integration test: Trigger API errors (invalid payload, server error); verify error is displayed to user
- Manual testing: Submit wizard form with invalid data; verify error message is clear and actionable

**Risk:** If not fixed, users receive no feedback on submission failure; unclear whether to retry or contact support.

---

### #AAAG-WIZARD-003: Payment State Validation

**Severity:** High  
**Component:** `platform/app/(wizard)/components/PaymentStep.tsx`  
**Owner:** engineer (Sprint N+1)  
**Blocked Until:** CI is green with integration test coverage; Go API payment state machine is fixed (see #AAAG-API-001)  

**Description:**
The wizard collects payment information but does not validate Stripe token generation or payment state transitions. The Go API payment state machine has unresolved TODOs that could leave orders in an incomplete state.

**Acceptance Criteria:**
- [ ] Add client-side validation for Stripe token generation in PaymentStep
- [ ] Add error handling for Stripe token generation failures
- [ ] Add integration test validating payment flow end-to-end with Go API
- [ ] Integration test covers success case (payment processed) and error cases (invalid card, declined card, network error)
- [ ] Verify that Go API payment state machine is fixed (see #AAAG-API-001)
- [ ] Integration test passes in CI pipeline

**Testing Approach:**
- Unit test: Mock Stripe token generation; verify error handling
- Integration test: Submit wizard form with valid and invalid payment data; verify payment state transitions correctly in Go API
- Manual testing: Submit wizard form with valid payment data; verify order is created and payment is processed

**Risk:** If not fixed, payment may fail silently; users unsure if they were charged.

---

### #AAAG-WIZARD-004: AI Service Content Validation

**Severity:** High  
**Component:** `platform/app/(wizard)/components/ContentPreview.tsx`  
**Owner:** engineer (Sprint N+1)  
**Blocked Until:** CI is green with integration test coverage; AI service error propagation is fixed (see #AAAG-AI-001)  

**Description:**
The wizard displays a preview of AI-generated content but does not validate that the AI service successfully generated the content. Errors from the Anthropic SDK are not propagated.

**Acceptance Criteria:**
- [ ] Add client-side validation for AI service response in ContentPreview
- [ ] Add error handling for AI service failures (API error, timeout, invalid response)
- [ ] Add integration test validating AI service contract (request/response schema)
- [ ] Integration test covers success case (content generated) and error cases (API error, timeout)
- [ ] Verify that AI service error propagation is fixed (see #AAAG-AI-001)
- [ ] Integration test passes in CI pipeline

**Testing Approach:**
- Unit test: Mock AI service responses; verify error handling
- Integration test: Request content generation from AI service; verify response schema and error handling
- Manual testing: Submit wizard form; verify content preview is generated and displayed correctly

**Risk:** If not fixed, users may see stale or failed content in preview; unclear if generation succeeded.

---

### #AAAG-WIZARD-005: Template Selection Validation

**Severity:** High  
**Component:** `platform/app/(wizard)/components/TemplateSelector.tsx`  
**Owner:** engineer (Sprint N+1)  
**Blocked Until:** CI is green with integration test coverage  

**Description:**
The wizard allows users to select from pre-built templates but does not validate that the selected template exists or is deployable. No validation against the `templates/` directory or deployment readiness.

**Acceptance Criteria:**
- [ ] Add client-side validation for template selection (verify template exists)
- [ ] Add integration test validating template inventory (verify all templates in `templates/` are selectable)
- [ ] Add integration test validating template deployment (verify selected template can be deployed)
- [ ] Integration test covers success case (template deployed) and error cases (template not found, deployment failed)
- [ ] Integration test passes in CI pipeline

**Testing Approach:**
- Unit test: Mock template inventory; verify validation logic
- Integration test: Select each template; verify it can be deployed
- Manual testing: Submit wizard form with each template; verify deployment succeeds

**Risk:** If not fixed, users may select a template that fails to deploy; unclear error messaging.

---

## Non-Blocking Issues (Sprint N+1 and Beyond)

### #AAAG-WIZARD-006: Input Validation

**Severity:** Medium  
**Component:** `platform/app/(wizard)/components/AppDetailsStep.tsx`  
**Owner:** engineer (Sprint N+1)  
**Blocked Until:** No blocking dependencies  

**Description:**
The wizard collects user input (app name, description, target audience) but does not validate input length, character restrictions, or required fields.

**Acceptance Criteria:**
- [ ] Add client-side validation for all input fields (required, length, character restrictions)
- [ ] Add unit test for input validation logic
- [ ] Add integration test validating server-side validation in Go API
- [ ] Both tests pass in CI pipeline

---

### #AAAG-WIZARD-007: Accessibility Audit

**Severity:** Medium  
**Component:** All wizard components  
**Owner:** engineer (Sprint N+1)  
**Blocked Until:** No blocking dependencies  

**Description:**
The wizard flow has not been audited for WCAG 2.1 AA compliance. No keyboard navigation testing, screen reader testing, or color contrast validation.

**Acceptance Criteria:**
- [ ] Audit wizard components for WCAG 2.1 AA compliance
- [ ] Add keyboard navigation support (Tab, Enter, Escape)
- [ ] Add screen reader support (ARIA labels, semantic HTML)
- [ ] Verify color contrast meets WCAG AA standards
- [ ] Add accessibility tests to CI pipeline

---

### #AAAG-WIZARD-008: Loading State and Timeout Handling

**Severity:** Medium  
**Component:** `platform/app/(wizard)/components/SubmitButton.tsx`  
**Owner:** engineer (Sprint N+1)  
**Blocked Until:** No blocking dependencies  

**Description:**
The wizard submission does not show loading state or handle request timeouts. Users may click submit multiple times if the request is slow, causing duplicate orders.

**Acceptance Criteria:**
- [ ] Add loading state to submit button (disable button, show spinner)
- [ ] Add timeout handling (abort request after 30 seconds, show error)
- [ ] Add unit test for loading state and timeout handling
- [ ] Unit test passes in CI pipeline

---

### #AAAG-WIZARD-009: State Persistence

**Severity:** Medium  
**Component:** `platform/app/(wizard)/context/WizardContext.tsx`  
**Owner:** engineer (Sprint N+1)  
**Blocked Until:** No blocking dependencies  

**Description:**
The wizard state is stored in React Context but is not persisted to localStorage. Users who refresh the page lose all progress.

**Acceptance Criteria:**
- [ ] Add localStorage persistence for wizard state
- [ ] Add unit test for state persistence (save and restore state)
- [ ] Unit test passes in CI pipeline

---

### #AAAG-WIZARD-010: Analytics Instrumentation

**Severity:** Low  
**Component:** All wizard components  
**Owner:** engineer (Sprint N+1)  
**Blocked Until:** No blocking dependencies  

**Description:**
The wizard flow has no analytics instrumentation. No tracking of step completion, drop-off points, or conversion metrics.

**Acceptance Criteria:**
- [ ] Add analytics library (e.g., Segment, Mixpanel)
- [ ] Instrument all wizard steps with analytics events
- [ ] Track step completion, drop-off points, and conversion metrics

---

### #AAAG-WIZARD-011: Help Text and Tooltips

**Severity:** Low  
**Component:** `platform/app/(wizard)/components/AppDetailsStep.tsx`, `PaymentStep.tsx`  
**Owner:** engineer (Sprint N+1)  
**Blocked Until:** No blocking dependencies  

**Description:**
The wizard steps lack contextual help text and tooltips explaining what each field means. Users may be confused about required information.

**Acceptance Criteria:**
- [ ] Add help text to all input fields
- [ ] Add tooltips explaining field requirements and constraints
- [ ] Update wizard README with help text and tooltip content

---

## Related Issues

- **#AAAG-API-001** — Fix payment state machine incomplete transitions in Go API (blocking #AAAG-WIZARD-003)
- **#AAAG-AI-001** — Fix Anthropic SDK error response not propagated to caller in AI service (blocking #AAAG-WIZARD-004)

---

## Summary

**Total Issues:** 11  
**Blocking:** 5 (must fix before shipping)  
**Non-Blocking:** 6 (Sprint N+1 and beyond)  

All blocking issues are mapped to CI coverage requirements in `docs/WIZARD_CI_CHECKLIST.md`.
