# TODO/FIXME Triage Framework

This document defines the categorization and handling rules for all TODO and FIXME annotations in the AaaG codebase.

## Purpose

TODO and FIXME markers indicate incomplete work, known issues, or deferred decisions. This framework ensures:
- Consistent categorization across the codebase
- Clear ownership and priority signals
- Blocking rules for critical paths (payment, auth)
- Traceability from code to sprint planning

## Severity Levels

### Critical

**Definition:** Blocks deployment, affects payment/auth/data integrity, or poses a security risk.

**Examples:**
- Unvalidated user input in payment processing
- Missing JWT expiry check in auth middleware
- Unencrypted sensitive data in transit

**Action:** Must be resolved before the next production release. If discovered during a sprint, escalate to the manager immediately.

### High

**Definition:** Degrades user experience, causes data loss, or introduces technical debt that compounds risk.

**Examples:**
- Missing error handling in API response parsing
- Incomplete feature flag logic
- Hardcoded credentials or environment-specific values

**Action:** Schedule for resolution in the current or next sprint. Document the impact and owner.

### Low

**Definition:** Nice-to-have improvements, code cleanup, or deferred optimizations.

**Examples:**
- Unused imports or variables
- Suboptimal algorithm that doesn't affect user-facing latency
- Missing comments on non-critical helper functions

**Action:** Log for future sprints. Can be resolved opportunistically during refactoring.

---

## Path Types

Every TODO/FIXME must be tagged with the code path it affects:

### Payment

**Scope:** Stripe integration, order processing, invoice generation, refund logic.

**Blocking Rule:** TODOs in payment paths are **blocked from fixing** until:
1. CI pipeline is green (AAAG-F01 complete)
2. Unit tests cover the affected code path
3. Integration tests validate end-to-end payment flow

**Rationale:** Payment systems are high-risk; changes require automated validation before merge.

### Auth

**Scope:** JWT validation, session management, permission checks, token refresh.

**Blocking Rule:** TODOs in auth paths are **blocked from fixing** until:
1. CI pipeline is green (AAAG-F01 complete)
2. Unit tests cover the affected code path
3. Security review is documented in the PR

**Rationale:** Auth is a critical security boundary; changes require peer review and automated testing.

### Data

**Scope:** Database schema, migrations, data validation, consistency checks.

**Blocking Rule:** TODOs in data paths require:
1. Migration strategy documented (if schema change)
2. Rollback plan in place
3. Backward compatibility verified

**Rationale:** Data changes are hard to undo; planning is essential.

### UI

**Scope:** Frontend components, styling, accessibility, user-facing text.

**Blocking Rule:** None — can be resolved independently.

**Rationale:** UI changes are low-risk and can be iterated quickly.

### Infra

**Scope:** CI/CD, deployment, monitoring, logging, environment configuration.

**Blocking Rule:** TODOs in infra paths require:
1. Impact assessment (does it affect all environments?)
2. Rollback strategy
3. Operator approval if cost or security implications exist

**Rationale:** Infra changes affect the entire team; coordination is necessary.

### Other

**Scope:** Anything not covered above (documentation, tests, tooling).

**Blocking Rule:** None — resolve as time permits.

---

## Annotation Format

All TODO and FIXME annotations must follow this format:

```
// TODO(<severity>, <path_type>): <brief description>
// <optional: additional context or blocking condition>
```

### Examples

**Critical payment issue:**
```go
// TODO(critical, payment): validate Stripe webhook signature before processing
// Blocked until CI is green and webhook handler has unit tests.
```

**High auth issue:**
```python
# TODO(high, auth): check JWT expiry before allowing request
# Blocked until CI is green and auth middleware is fully tested.
```

**Low UI improvement:**
```jsx
// TODO(low, ui): add loading spinner to form submission
// Can be resolved opportunistically; no blocking condition.
```

**Data migration:**
```sql
-- TODO(high, data): add NOT NULL constraint to users.email
-- Requires migration strategy: backfill existing NULLs, then add constraint.
-- Rollback: drop constraint if needed.
```

---

## Triage Process

### During Code Review

1. **Identify:** Peer reviewer spots a TODO/FIXME in the PR.
2. **Validate:** Check that the annotation follows the format above.
3. **Assess:** Determine if the severity and path type are correct.
4. **Block if needed:** If the TODO is in a payment/auth path and CI is not yet green, request that the PR be held until AAAG-F01 is complete.
5. **Document:** Add a comment in the PR linking to the triage report.

### During Sprint Planning

1. **Scan:** Run a codebase search for all TODO/FIXME markers.
2. **Report:** Generate a triage report (see [TRIAGE_REPORT.md](TRIAGE_REPORT.md)).
3. **Prioritize:** Rank by severity and path type.
4. **Assign:** Allocate to sprints based on risk and effort.
5. **Track:** Link each TODO to a sprint item or backlog issue.

### During Sprint Execution

1. **Resolve or Escalate:** For each assigned TODO:
   - If straightforward (≤ 0.5 day), resolve inline with a test.
   - If complex, convert to a tracked issue with acceptance criteria.
2. **Document Outcome:** In the PR or issue, record:
   - What was done (resolved, deferred, escalated)
   - Why (if deferred or escalated)
   - Test coverage (if resolved)
3. **Close:** Once resolved, remove the TODO/FIXME annotation.

---

## Blocking Rules Summary

| Path Type | Blocking Condition | Unblocks When |
|---|---|---|
| **Payment** | CI not green OR no unit tests | AAAG-F01 merged + tests added |
| **Auth** | CI not green OR no unit tests | AAAG-F01 merged + tests added + security review |
| **Data** | No migration strategy | Migration strategy documented + rollback plan |
| **UI** | None | Immediately |
| **Infra** | No impact assessment | Impact assessed + rollback strategy + operator approval (if needed) |
| **Other** | None | Immediately |

---

## Questions?

Refer to the sprint plan ([SPRINT_N.md](../SPRINT_N.md)) or the triage report ([TRIAGE_REPORT.md](TRIAGE_REPORT.md)). If you need clarification on severity, path type, or blocking conditions, ask during sprint standup or in the PR review.
