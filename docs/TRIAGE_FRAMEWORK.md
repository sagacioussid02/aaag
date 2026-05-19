# TODO/FIXME Triage Framework

## Overview

This framework provides a standardized approach to categorizing, tracking, and resolving TODO and FIXME annotations in the AaaG codebase. All TODO/FIXME comments must follow this framework to ensure visibility, prioritization, and eventual resolution.

---

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

---

## Triage Process

When a TODO/FIXME is discovered during code review or sprint planning:

1. **Locate and Document**: Record the file path, line number, and exact text of the TODO/FIXME.
2. **Assess Severity**: Determine if it is critical, high, medium, or low based on impact.
3. **Classify Path Type**: Assign the appropriate functional area (payment, auth, data, ui, infra, other).
4. **Decide Action**:
   - **If critical or high**: Create a GitHub Issue immediately with severity label and owner.
   - **If medium or low**: Add to backlog; create a GitHub Issue if it will take > 1 day to resolve.
5. **Remove or Update**: Either fix the TODO in the current PR or update the comment to reference the GitHub Issue number.

---

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

---

## Questions?

Refer to the sprint plan or ask during sprint standup. All TODO/FIXME decisions are made during sprint planning and code review.
