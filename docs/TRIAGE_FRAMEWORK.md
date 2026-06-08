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
## Severity Levels

### 🔴 **Critical**

- **Definition**: Blocks deployment, affects payment processing, authentication, or data integrity.
- **Action**: Must be resolved before any PR merge. Escalate immediately if discovered.
- **Example**: `// TODO(critical, payment): validate transaction ID before recording in DB`

### 🟠 **High**

- **Definition**: Affects core functionality, user experience, or security (non-payment/auth).
- **Action**: Should be resolved in the current sprint or the next. Track in GitHub Issues if deferred.
- **Example**: `// TODO(high, data): add input sanitization for user-generated content`

### 🟡 **Medium**

- **Definition**: Nice-to-have improvements, performance optimizations, or code quality enhancements.
- **Action**: Can be deferred to future sprints. Track in backlog.
- **Example**: `// TODO(medium, infra): refactor this function for readability`

### 🟢 **Low**

- **Definition**: Cosmetic changes, documentation improvements, or minor cleanup.
- **Action**: Can be addressed opportunistically or deferred indefinitely.
- **Example**: `// TODO(low, ui): update button color to match new design system`

---

## Path Types

Every TODO/FIXME must be tagged with one of the following path types to indicate the functional area affected:

| Path Type | Description | Examples |
|-----------|-------------|----------|
| **payment** | Payment processing, Stripe integration, transaction recording | Charge validation, refund logic, invoice generation |
| **auth** | Authentication, authorization, JWT handling, session management | Token validation, permission checks, login flow |
| **data** | Database operations, data integrity, migrations, schema changes | Query optimization, constraint validation, data consistency |
| **ui** | User interface, frontend rendering, accessibility, styling | Button placement, form validation, responsive design |
| **infra** | Infrastructure, deployment, CI/CD, environment configuration | Docker setup, GitHub Actions, environment variables |
| **other** | Anything not covered above | Logging, error handling, documentation |

---

## Annotation Format

All TODO/FIXME comments must follow this format:

```
// TODO(<severity>, <path_type>): <brief description>
// [Optional: Additional context or blocking conditions]
```

### Examples

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
**Payment path, critical severity:**
```go
// TODO(critical, payment): validate JWT expiry before processing requests
// Blocked until CI is green and auth path is fully tested.
```

**Data path, high severity:**
```python
# TODO(high, data): add foreign key constraint on portfolio_id
# This prevents orphaned records if a portfolio is deleted.
```

**UI path, low severity:**
```typescript
// TODO(low, ui): update button color to match new design system
```

**Infrastructure path, medium severity:**
```bash
# TODO(medium, infra): add health check endpoint to Go API
# Needed for Kubernetes liveness probes in production.
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
## Triage Process

When a TODO/FIXME is discovered during code review or sprint planning:

1. **Locate and Document**: Record the file path, line number, and exact text of the TODO/FIXME.
2. **Assess Severity**: Determine if it is critical, high, medium, or low based on impact.
3. **Classify Path Type**: Assign the appropriate functional area (payment, auth, data, ui, infra, other).
4. **Decide Action**:
   - **If critical or high**: Create a GitHub Issue immediately with severity label and owner.
   - **If medium or low**: Add to backlog; create a GitHub Issue if it will take > 1 day to resolve.
5. **Remove or Update**: Either fix the TODO in the current PR or update the comment to reference the GitHub Issue number.

Blocking conditions must be noted in the annotation and tracked in the triage report.

## Escalation

If a TODO/FIXME assessment reveals:
- A security vulnerability (critical severity)
- A defect in a payment or auth path
- Effort exceeding the time-box
- A dependency on external approval or procurement

Then the issue must be escalated immediately as a Decision Record or tracked issue with appropriate severity label. Do not attempt to resolve in the same sprint without re-scoping.

## Triage Report
## GitHub Issue Template

When creating a GitHub Issue for a deferred TODO/FIXME, use this template:

```markdown
## Title
[Severity] [Path Type] — [Brief description]

Example: [HIGH] [Payment] — Validate transaction ID before recording in DB

## Description

Original TODO/FIXME:
```
// TODO(high, payment): validate transaction ID before recording in DB
```

## Impact

[Explain why this matters: user-facing, security, data integrity, etc.]

## Reproduction Steps

[If applicable, describe how to trigger the issue.]

## Acceptance Criteria

- [ ] [Specific, testable outcome]
- [ ] [Another outcome]

## Blocking Issues

[List any dependencies or blockers.]

## Assignee

[Owner name]
```

---

## Blocked TODOs

Some TODOs may be blocked by infrastructure or other work. Mark these explicitly:

```go
// TODO(high, auth): add JWT expiry validation
// Blocked until CI is green (TD-001) and auth test suite is complete.
```

When the blocking condition is resolved, update the comment to remove the "Blocked" note and create a GitHub Issue if the TODO is not immediately fixed.

---

## Triage Report

At the end of each sprint, generate a triage report (see `docs/TRIAGE_REPORT.md`) that lists:

1. All TODOs/FIXMEs discovered in the sprint
2. Their severity and path type
3. Action taken (fixed, deferred to GitHub Issue, or deferred to backlog)
4. GitHub Issue numbers for deferred items

This report is committed to the repository and serves as the audit trail for technical debt.

---

## Contributing

When adding a new TODO/FIXME to the codebase:

1. Follow the annotation format above.
2. Always include a severity level and path type.
3. If it is critical or high, create a GitHub Issue immediately.
4. Reference the GitHub Issue number in the comment if applicable.
5. Do not commit a TODO/FIXME without a clear path to resolution (either in the current sprint or a tracked GitHub Issue).

The triage report (TRIAGE_REPORT.md) is generated during sprint planning and updated as issues are resolved. It serves as the single source of truth for all TODO/FIXME items in the codebase.

## Review Cadence

- **Per-sprint**: Triage report is reviewed and updated at the start of each sprint.
- **Per-PR**: New TODO/FIXME annotations are reviewed during code review to ensure they follow the framework.
- **Per-release**: All critical and high-severity items must be resolved or escalated before release.
## Questions?

Refer to the sprint plan or ask during sprint standup. All TODO/FIXME decisions are made during sprint planning and code review.
