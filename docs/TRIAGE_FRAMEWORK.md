# TODO/FIXME Triage Framework

## Overview

This framework provides a standardized approach to categorizing and tracking TODO and FIXME annotations in the AaaG codebase. All TODOs and FIXMEs must follow this framework to ensure visibility, prioritization, and accountability.

## Severity Levels

### P1 (Critical — Blocks Production)

Items in payment processing, AI generation, or authentication paths that:
- Prevent core user journeys from completing
- Risk silent failures or data loss
- Affect revenue or security
- Must be resolved before production traffic

**Blocked until:** CI is green and the affected code path has test coverage.

### P2 (High — Should Fix This Sprint)

Items that:
- Affect non-critical user paths or operational efficiency
- Have workarounds but are not ideal
- Reduce code quality or maintainability
- Should be resolved within the current sprint if capacity allows

### P3 (Medium — Backlog)

Items that:
- Are nice-to-have improvements
- Have no immediate user impact
- Can be deferred to future sprints
- May be addressed opportunistically during refactoring

## Path Types

Each TODO/FIXME must be tagged with one or more path types:

- **payment** — Order processing, payment gateway, billing, refunds
- **ai_generation** — Claude API calls, content generation, prompt handling
- **auth** — User authentication, JWT validation, session management
- **data** — Database operations, migrations, data consistency
- **ui** — User interface, form validation, error display
- **infra** — Deployment, configuration, environment setup
- **other** — Miscellaneous or unclear

## Annotation Format

All TODO and FIXME annotations must follow this format:

```
// TODO(severity, path_type): brief description
// Issue: #AAAG-XXX
// Owner: role (engineer, senior_engineer, cloud_devops)
// Deadline: Sprint N
// Blocked: [yes/no] — reason if yes
```

### Example

```go
// TODO(P1, payment): validate order total before charging customer
// Issue: #AAAG-001
// Owner: senior_engineer
// Deadline: Sprint 8
// Blocked: yes — waiting for payment validation tests to be written
```

```python
# FIXME(P2, ai_generation): handle truncated Claude responses gracefully
# Issue: #AAAG-003
# Owner: engineer
# Deadline: Sprint 9
# Blocked: no
```

## Triage Process

1. **Locate** — Find all TODO/FIXME annotations in the codebase
2. **Classify** — Assign severity (P1/P2/P3) and path type(s)
3. **Track** — Create or reference a GitHub issue for each item
4. **Assign** — Designate an owner and target sprint
5. **Report** — Document findings in TRIAGE_REPORT.md
6. **Resolve** — Address P1 items before production deployment

## Blocking Rules

- **P1 items in payment or AI generation paths** are automatically blocked until:
  - CI is green (all tests pass)
  - The affected code path has minimum viable test coverage
  - A peer engineer has reviewed the fix
  - The operator has approved the change

- **P2 and P3 items** may be resolved opportunistically but should not block releases

## Current Triage Report

See [docs/TRIAGE_REPORT.md](TRIAGE_REPORT.md) for the current audit of all TODO/FIXME hits and their status.

## References

- [CONTRIBUTING.md](../CONTRIBUTING.md) — Branch naming and PR process
- [TRIAGE_REPORT.md](TRIAGE_REPORT.md) — Current triage audit results
