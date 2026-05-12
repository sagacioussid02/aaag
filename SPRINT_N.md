# Sprint N: "Lay the Foundation"

**Duration:** 1 week (next calendar week)  
**Status:** Operator-approved, ready for execution  
**Prepared by:** Manager (Minions Organization)  
**Project:** AaaG

---

## Sprint Goal

Eliminate the most critical structural risks blocking safe feature delivery:

1. **Absence of a CI safety net** — No automated testing, linting, or build validation.
2. **Unaudited dependency surface** — 13 npm, 4 Python, and Go module dependencies with unknown vulnerability status.
3. **254 TODO/FIXME annotations** — Untracked technical debt concentrated in payment and auth paths, blocking reliable estimation and safe execution of downstream work.

This sprint establishes the foundation for all future feature and integration test work.

---

## Sprint Items

### Item 1: Configure CI/CD Pipeline (GitHub Actions)

| Field | Value |
|-------|-------|
| **Type** | `tech_debt` |
| **Priority** | P0 — Must complete this sprint |
| **Estimated Effort** | 3–5 days |
| **Assigned Track** | Track A (starts Day 1) |
| **Risk Score** | 🟢 Low |

**Description:**

Configure GitHub Actions CI workflows for all three services:
- **Go API** (`api/`) — build, lint, test
- **Python FastAPI** (`ai-service/`) — build, lint, test
- **Next.js platform** (`platform/`) — build, lint, test

Each service gets its own job or matrix entry. This is the hard prerequisite for automated dependency scanning (Item 2) and future integration test execution (deferred to Sprint N+1).

**Acceptance Criteria:**
- ✅ CI runs on every PR and push to main
- ✅ Go, Python, and Node.js jobs all pass on a clean branch
- ✅ Lint gates are enforced for all three runtimes
- ✅ CI status badge added to README

---

### Item 2: Audit and Pin Dependencies Across npm, pip, and Go Modules

| Field | Value |
|-------|-------|
| **Type** | `tech_debt` |
| **Priority** | P1 — Complete this sprint |
| **Estimated Effort** | 1–2 days |
| **Assigned Track** | Track B (runs in parallel with Item 1) |
| **Risk Score** | 🟢 Low |

**Description:**

Perform a manual audit of all three package ecosystems:
- `platform/package.json` — 13 npm dependencies
- `ai-service/requirements.txt` — 4 Python dependencies
- `api/go.mod` — Go modules

Pin versions where unpinned, run `npm audit`, `pip-audit`, and `govulncheck` manually, and document any flagged vulnerabilities. The full automated scanning benefit is unlocked once CI (Item 1) is live, but the manual pass delivers immediate security value and a reproducibility baseline.

**Acceptance Criteria:**
- ✅ All three dependency files have pinned/locked versions
- ✅ Audit tool output documented (findings log committed to repo)
- ✅ Any critical/high CVEs flagged as follow-up issues
- ✅ Dependency scanning step stubbed into CI workflow (to be activated once Item 1 lands)

---

### Item 3: Triage Phase — Audit TODO/FIXME Annotations in Source Code

| Field | Value |
|-------|-------|
| **Type** | `tech_debt` |
| **Priority** | P1 — Triage phase only this sprint; fix phase deferred to Sprint N+1 |
| **Estimated Effort** | 2–3 days (triage/categorization only) |
| **Assigned Track** | Track B (begins mid-week, after dep audit wraps) |
| **Risk Score** | 🟡 Medium |

**Description:**

Triage and categorize all 254 TODO/FIXME annotations across the codebase (~1,300 LOC, ~1 annotation per 5 lines). The goal this sprint is **categorization only** — not fixes.

Each annotation is tagged by:
- (a) Service/file
- (b) Severity (critical / high / low)
- (c) Path type (payment, auth, data, UI, infra, other)

Payment-path and auth-path TODOs are flagged as blocked from fixing until CI is green.

Output is a triage report committed to the repo that de-risks estimation for Sprint N+1 fix work and Item 5 (integration tests).

**Acceptance Criteria:**
- ✅ All 254 TODO/FIXME items catalogued in a triage document (CSV or Markdown table)
- ✅ Each item tagged by service, severity, and path type
- ✅ Payment/auth-path items explicitly flagged as "fix-blocked until CI green"
- ✅ Triage report committed to repo and linked from project README or CONTRIBUTING doc
- ✅ Count of critical-severity items reported to sprint review

---

## Sprint Summary Table

| # | Title | Type | Priority | Effort | Risk |
|---|-------|------|----------|--------|------|
| 1 | Configure CI/CD Pipeline (GitHub Actions) | `tech_debt` | P0 | 3–5 days | 🟢 Low |
| 2 | Audit & Pin Dependencies (npm, pip, Go) | `tech_debt` | P1 | 1–2 days | 🟢 Low |
| 3 | Triage TODO/FIXME Annotations (triage phase only) | `tech_debt` | P1 | 2–3 days | 🟡 Medium |

---

## Deferred Items (Not This Sprint)

| Item | Reason for Deferral |
|------|---------------------|
| **Expand Micro-App Template Library** (feature) | New feature surface on a foundation with 254 TODOs and no CI is high-risk. Deferred to Sprint N+2 after CI is green, dep audit is complete, and TODO triage has cleared template/platform code paths. |
| **Integration Tests: Order & Payment Flow** | Blocked by CI (Item 1) and TODO triage (Item 3). Writing tests against potentially incomplete payment logic risks encoding broken behavior as expected. Deferred to Sprint N+1. |

---

## Estimated Sprint Cost

| Item | Effort (Days) | Estimated Cost (@ $800/day) |
|------|---------------|-----------------------------|
| Item 1 — CI/CD Pipeline | 4 days (midpoint) | $3,200 |
| Item 2 — Dependency Audit & Pin | 1.5 days (midpoint) | $1,200 |
| Item 3 — TODO/FIXME Triage | 2.5 days (midpoint) | $2,000 |
| **Total** | **8 days** | **$6,400** |

> Cost estimate uses a blended senior engineer day rate of $800/day. Two engineers working parallel tracks (Track A: CI; Track B: dep audit → triage) keeps wall-clock time within a single 5-day sprint week.

---

## Sprint Risk Assessment

### Overall Sprint Risk: 🟢 **Low**

| Risk Factor | Severity | Mitigation |
|-------------|----------|------------|
| No CI safety net during sprint | Medium | CI is Item 1, P0 — addressed first |
| TODO density in payment/auth paths | Medium | Triage-only this sprint; no fixes to critical paths until CI is green |
| Three-runtime CI complexity | Low-Medium | Standard GitHub Actions patterns; well-documented for all three runtimes |
| Dependency vulnerabilities surfaced | Low | Audit is read-only this sprint; fixes scoped to pinning, not upgrades |
| Feature deferral (template library) | Low | Deliberate and documented; no business commitment broken |
| Scope creep from TODO triage findings | Low-Medium | Triage output is a report only; no unplanned fixes authorized this sprint |

**Rationale for Low overall score:** All three sprint items are well-understood, low-novelty tasks with mature tooling. The highest-risk work (TODO fixes in payment paths, integration tests, new feature surface) has been explicitly deferred. The sprint is designed to reduce total project risk, not introduce it.

---

## Sequencing Plan (Multi-Sprint View)

```
Sprint N (this sprint — "Lay the Foundation"):
  Track A │ Day 1–5:  Item 1 — CI/CD Pipeline setup
  Track B │ Day 1–2:  Item 2 — Dependency audit & pin (manual pass)
  Track B │ Day 3–5:  Item 3 — TODO/FIXME triage (categorization report)

Sprint N+1 ("Stabilize"):
  Item 3 fix phase — critical TODO subset (now with CI safety net)
  Item 5 — Integration tests: order & payment flow (CI live, TODO landscape known)
  Feature candidate re-evaluated based on triage findings

Sprint N+2 ("Expand"):
  Item 3 — Expand Micro-App Template Library (feature)
  Remaining TODO/FIXME fixes (lower severity)
```

---

## Next Steps

1. ✅ **Operator approval** — This plan has been approved.
2. **Engineer assignment** — Track A and Track B engineers assigned.
3. **Sprint kickoff** — Standup scheduled for Day 1.
4. **Daily standups** — 15 min each morning to track progress and surface blockers.
5. **Sprint review** — End-of-week review to assess completion and plan Sprint N+1.

---

## References

- [CONTRIBUTING.md](CONTRIBUTING.md) — Branch naming, PR process, triage framework
- [docs/TRIAGE_FRAMEWORK.md](docs/TRIAGE_FRAMEWORK.md) — TODO/FIXME categorization schema
- [README.md](README.md) — Project overview and quick start
