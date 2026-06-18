# Wizard Flow CI Coverage Checklist — Sprint 7

## Gate: No New Wizard Surface Ships Without CI Coverage

This checklist defines the CI coverage requirements that must be met before any new wizard surface (component, page, or flow) can be merged to `main`.

**Enforcement:** All PRs touching `platform/app/(wizard)/` must satisfy this checklist before merge.

---

## Pre-Merge Checklist

### For All Wizard Changes

- [ ] **Linting passes** — `npm run lint` passes with no errors or warnings
- [ ] **Type checking passes** — `npm run type-check` passes with no TypeScript errors
- [ ] **Unit tests pass** — `npm run test` passes with no failures
- [ ] **Build succeeds** — `npm run build` succeeds with no errors

### For Changes to Core Wizard Flow (SubmitButton, PaymentStep, ContentPreview, TemplateSelector)

- [ ] **Integration test added** — New integration test covers the changed component
- [ ] **Integration test passes** — Integration test passes in CI pipeline
- [ ] **Error handling tested** — Integration test covers success and error cases
- [ ] **API contract validated** — Integration test validates request/response schema with backend

### For Changes to Wizard State Management (WizardContext)

- [ ] **State persistence test added** — Unit test covers state save/restore
- [ ] **State persistence test passes** — Unit test passes in CI pipeline

### For Changes to Wizard UI (AppDetailsStep, TemplateSelector, PaymentStep)

- [ ] **Accessibility test added** — Unit test covers keyboard navigation and ARIA labels
- [ ] **Accessibility test passes** — Unit test passes in CI pipeline

---

## Blocking Issues and CI Coverage Requirements

The following 5 blocking issues must be resolved before any new wizard surface ships. Each issue has specific CI coverage requirements:

### #AAAG-WIZARD-001: API Contract Validation

**CI Coverage Required:**
- [ ] Integration test: `POST /api/orders` with valid payload → verify response schema
- [ ] Integration test: `POST /api/orders` with invalid payload → verify error response schema
- [ ] Integration test: Verify order is created in database with correct state
- [ ] Integration test passes in CI pipeline

**Test File:** `platform/__tests__/integration/wizard-api-contract.test.ts`

---

### #AAAG-WIZARD-002: Error Handling in Wizard Submission

**CI Coverage Required:**
- [ ] Unit test: Mock API error → verify error handler catches error
- [ ] Unit test: Mock API error → verify error is displayed to user
- [ ] Unit test: Mock network error → verify error handler catches error
- [ ] Integration test: Trigger API error → verify error is displayed to user
- [ ] Unit and integration tests pass in CI pipeline

**Test Files:**
- `platform/__tests__/unit/SubmitButton.test.tsx`
- `platform/__tests__/integration/wizard-error-handling.test.ts`

---

### #AAAG-WIZARD-003: Payment State Validation

**CI Coverage Required:**
- [ ] Unit test: Mock Stripe token generation → verify error handling
- [ ] Unit test: Mock Stripe token generation → verify success case
- [ ] Integration test: Submit payment with valid card → verify payment state in Go API
- [ ] Integration test: Submit payment with invalid card → verify error handling
- [ ] Integration test: Verify order state transitions correctly through payment flow
- [ ] Unit and integration tests pass in CI pipeline

**Test Files:**
- `platform/__tests__/unit/PaymentStep.test.tsx`
- `platform/__tests__/integration/wizard-payment-flow.test.ts`

**Dependency:** #AAAG-API-001 (Go API payment state machine fix) must be merged first

---

### #AAAG-WIZARD-004: AI Service Content Validation

**CI Coverage Required:**
- [ ] Unit test: Mock AI service response → verify error handling
- [ ] Unit test: Mock AI service response → verify success case
- [ ] Integration test: Request content generation → verify response schema
- [ ] Integration test: Request content generation → verify error handling
- [ ] Integration test: Verify content is displayed in preview
- [ ] Unit and integration tests pass in CI pipeline

**Test Files:**
- `platform/__tests__/unit/ContentPreview.test.tsx`
- `platform/__tests__/integration/wizard-ai-content.test.ts`

**Dependency:** #AAAG-AI-001 (AI service error propagation fix) must be merged first

---

### #AAAG-WIZARD-005: Template Selection Validation

**CI Coverage Required:**
- [ ] Unit test: Mock template inventory → verify validation logic
- [ ] Integration test: Select each template → verify template exists
- [ ] Integration test: Select each template → verify template can be deployed
- [ ] Integration test: Verify deployment succeeds for all templates
- [ ] Unit and integration tests pass in CI pipeline

**Test Files:**
- `platform/__tests__/unit/TemplateSelector.test.tsx`
- `platform/__tests__/integration/wizard-template-selection.test.ts`

---

## CI Pipeline Configuration

The CI pipeline (GitHub Actions) must be configured to run the following steps for all PRs touching `platform/app/(wizard)/`:

```yaml
# .github/workflows/platform-wizard-ci.yml (to be created by cloud_devops)

name: Platform Wizard CI

on:
  pull_request:
    paths:
      - 'platform/app/(wizard)/**'
      - 'platform/__tests__/**'
      - 'platform/package.json'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd platform && npm install
      - run: cd platform && npm run lint
      - run: cd platform && npm run type-check
      - run: cd platform && npm run test
      - run: cd platform && npm run build
      - run: cd platform && npm run test:integration
```

---

## Enforcement

**Branch Protection Rule:** No PR can be merged to `main` without:
1. All CI checks passing (lint, type-check, unit tests, integration tests, build)
2. At least one peer review approval
3. Operator approval (after peer review)

**Wizard-Specific Gate:** Any PR touching `platform/app/(wizard)/` must satisfy the checklist above before merge.

---

## Testing Strategy

### Unit Tests

**Purpose:** Test individual components in isolation (mocked dependencies)

**Coverage:**
- Component rendering
- User interactions (click, input, submit)
- State changes
- Error handling
- Accessibility (keyboard navigation, ARIA labels)

**Tools:** Jest, React Testing Library

**Location:** `platform/__tests__/unit/`

### Integration Tests

**Purpose:** Test components with real backend dependencies (or mocked HTTP)

**Coverage:**
- API contract validation (request/response schema)
- Error propagation from backend
- State transitions across multiple components
- End-to-end wizard flow (multiple steps)

**Tools:** Jest, Supertest (for HTTP mocking), or Playwright (for E2E)

**Location:** `platform/__tests__/integration/`

### Manual Testing

**Purpose:** Verify user experience and catch issues not covered by automated tests

**Coverage:**
- Wizard flow from start to finish
- Error scenarios (invalid input, network error, payment failure)
- Cross-browser compatibility
- Mobile responsiveness

**Frequency:** Before each release

---

## Test Coverage Targets

- **Statements:** ≥ 80%
- **Branches:** ≥ 75%
- **Functions:** ≥ 80%
- **Lines:** ≥ 80%

**Enforcement:** CI pipeline fails if coverage falls below targets.

---

## Rollout Plan

### Sprint 7 (This Sprint)

1. **File all tracked issues** (#AAAG-WIZARD-001 through #AAAG-WIZARD-011)
2. **Stand up CI pipeline** (owned by cloud_devops) with coverage gates
3. **Document CI checklist** (this document)

### Sprint N+1

1. **Implement fixes for blocking issues** (#AAAG-WIZARD-001 through #AAAG-WIZARD-005)
2. **Add CI coverage** for all fixes (unit tests, integration tests)
3. **Merge fixes to main** once CI is green and peer review is approved
4. **Address non-blocking issues** (#AAAG-WIZARD-006 through #AAAG-WIZARD-011) as capacity allows

### Sprint N+2 and Beyond

1. **Implement remaining non-blocking issues**
2. **Add E2E tests** for complete wizard flow
3. **Optimize conversion funnel** based on analytics data

---

## Questions?

Refer to the wizard audit (`docs/WIZARD_AUDIT.md`) or tracked issues (`docs/WIZARD_GAPS.md`) for more details on each gap and its acceptance criteria.
