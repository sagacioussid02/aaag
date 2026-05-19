# TODO/FIXME Triage Framework

## Overview

This framework provides a standardized approach to categorizing, tracking, and resolving TODO and FIXME annotations in the AaaG codebase. All TODO/FIXME markers must follow this framework to ensure visibility, prioritization, and timely resolution.

## Severity Levels

### Critical
- Indicates a security vulnerability, data loss risk, or payment/auth path defect.
- Must be resolved before code can merge to main.
- Examples: unvalidated user input in payment flow, missing JWT validation, SQL injection risk.

### High
- Indicates a functional defect, missing error handling, or incomplete feature.
- Should be resolved before the next release or within the current sprint.
- Examples: incomplete error recovery, missing edge-case handling, incomplete API endpoint.

### Low
- Indicates a code quality improvement, refactoring opportunity, or minor enhancement.
- Can be deferred to a future sprint without blocking delivery.
- Examples: code duplication, performance optimization, documentation gap.

## Path Types

Path types categorize the functional area affected by the TODO/FIXME:

- **payment**: Affects order processing, payment validation, or Stripe integration.
- **auth**: Affects authentication, authorization, JWT validation, or session management.
- **data**: Affects database schema, migrations, or data integrity.
- **ui**: Affects user interface, form validation, or user experience.
- **infra**: Affects CI/CD, deployment, configuration, or infrastructure.
- **other**: Does not fit the above categories.

## Annotation Format

All TODO/FIXME annotations must follow this format:

```
// TODO(severity, path_type): brief description
// Additional context or blocking conditions (optional).
```

### Examples

**Critical payment issue:**
```go
// TODO(critical, payment): validate order total against inventory before charging
// Blocked until CI is green and payment path is fully tested.
```

**High auth issue:**
```python
# TODO(high, auth): implement JWT expiry validation on all protected endpoints
# Affects /api/dashboard and /api/orders endpoints.
```

**Low UI improvement:**
```typescript
// TODO(low, ui): add loading spinner to form submission
// Can be deferred to Phase 2.
```

## Triage Process

1. **Locate**: Scan the codebase for all TODO and FIXME annotations.
2. **Categorize**: Assign severity (critical, high, low) and path type (payment, auth, data, ui, infra, other).
3. **Assess**: Determine if the issue is:
   - **Resolved**: Code path is complete and tested; annotation can be removed.
   - **Tracked**: Issue is known and tracked in the issue tracker with a severity label; annotation remains with issue link.
   - **Blocked**: Issue is blocked by another task (e.g., CI setup); annotation remains with blocking condition noted.
4. **Report**: Document findings in TRIAGE_REPORT.md with location, severity, path type, and status.
5. **Review**: Include triage findings in sprint planning and PR reviews.

## Blocking Conditions

Certain TODO/FIXME items may be blocked by infrastructure or dependency work:

- **CI not green**: Payment and auth path TODOs are blocked until CI pipeline is established and passing.
- **Dependencies unpinned**: Python and npm dependency audits must complete before code changes that depend on specific versions.
- **External service unavailable**: TODOs depending on third-party APIs (e.g., Stripe, Anthropic) are blocked until integration is confirmed.

Blocking conditions must be noted in the annotation and tracked in the triage report.

## Escalation

If a TODO/FIXME assessment reveals:
- A security vulnerability (critical severity)
- A defect in a payment or auth path
- Effort exceeding the time-box
- A dependency on external approval or procurement

Then the issue must be escalated immediately as a Decision Record or tracked issue with appropriate severity label. Do not attempt to resolve in the same sprint without re-scoping.

## Triage Report

The triage report (TRIAGE_REPORT.md) is generated during sprint planning and updated as issues are resolved. It serves as the single source of truth for all TODO/FIXME items in the codebase.

## Review Cadence

- **Per-sprint**: Triage report is reviewed and updated at the start of each sprint.
- **Per-PR**: New TODO/FIXME annotations are reviewed during code review to ensure they follow the framework.
- **Per-release**: All critical and high-severity items must be resolved or escalated before release.
