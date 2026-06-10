# TODO/FIXME Triage Framework

This document defines the categorization and triage process for all TODO and FIXME annotations in the AaaG codebase.

## Severity Levels

- **CRITICAL**: Affects payment processing, authentication, or app delivery. Must be fixed before production deployment or converted to a tracked issue with explicit owner and deadline.
- **HIGH**: Affects core user flows or data integrity. Should be fixed in the current or next sprint.
- **MEDIUM**: Affects secondary features or performance. Can be deferred to a future sprint with explicit tracking.
- **LOW**: Nice-to-have improvements or code quality. Can be deferred indefinitely with explicit tracking.

## Path Types

- **payment**: Affects order processing, payment confirmation, or billing
- **auth**: Affects authentication, authorization, or session management
- **data**: Affects data integrity, validation, or persistence
- **ui**: Affects user interface or user experience
- **infra**: Affects infrastructure, deployment, or DevOps
- **other**: Does not fit the above categories

## Annotation Format

All TODO and FIXME annotations must follow this format:

```
// TODO(severity, path_type): brief description
// Issue: #ISSUE_ID (if tracked) or "Untracked" (if not yet tracked)
// Owner: role or name (if tracked) or "Unassigned" (if not yet tracked)
// Deadline: Sprint N or date (if tracked) or "TBD" (if not yet tracked)
```

Example:
```go
// TODO(critical, payment): validate Stripe webhook signature before processing
// Issue: #AAAG-001
// Owner: cloud_devops
// Deadline: Sprint 7
```

## Triage Process

1. **Discovery**: During code review or sprint planning, identify all TODO/FIXME annotations.
2. **Categorization**: Assign severity and path type using the framework above.
3. **Tracking**: If severity is CRITICAL or HIGH, create a tracked issue with explicit owner and deadline.
4. **Documentation**: Update docs/TRIAGE_REPORT.md with the triage decision.
5. **Blocking**: If severity is CRITICAL and affects payment/auth paths, block CI merge until the issue is tracked and owner is assigned.

## Triage Report

The current triage report is maintained in [docs/TRIAGE_REPORT.md](TRIAGE_REPORT.md).

## Questions?

Refer to the sprint plan or ask during sprint standup.
