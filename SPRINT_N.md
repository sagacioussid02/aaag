# AaaG — Sprint N: "Lay the Foundation"

## Sprint Goal

Establish the automated safety infrastructure and resolve known technical unknowns before any user-facing feature work proceeds. This sprint deliberately prioritises foundation over feature velocity: every subsequent sprint will be faster, safer, and more confident once these items are green.

---

## Sprint Items

### 🔧 Tech Debt — PRIMARY

| Field | Detail |
|-------|--------|
| **ID** | TD-001 |
| **Title** | Set up CI/CD pipeline (GitHub Actions) |
| **Type** | `tech_debt` |
| **Description** | Configure GitHub Actions workflows covering lint, test, and build jobs for all three service stacks: Next.js (platform), Go (API), and Python (ai-service). Each service gets its own job; PRs are blocked from merge until all jobs pass. |
| **Acceptance Criteria** | ① CI runs on every PR and push to main. ② All three stacks (Next.js, Go, Python) have lint + build jobs. ③ At least a smoke-test job per service. ④ PR merge is gated on green CI. |
| **Estimated Effort** | Medium — 2–3 days |
| **Estimated Cost** | ~24 engineer-hours @ standard rate |
| **Risk Score** | 🟢 **Low** — purely additive infrastructure; zero production code touched |
| **Source Signal** | Profile: `CI configured: False` |
| **Dependencies** | None — this is the unblocking item for all others |

---

### 🐛 Bug / Tech Debt — SECONDARY

| Field | Detail |
|-------|--------|
| **ID** | BUG-001 |
| **Title** | Investigate and resolve the 1 documented TODO/FIXME in source |
| **Type** | `bug` (triage first; reclassify if purely cosmetic) |
| **Description** | Locate the single tracked TODO/FIXME in the codebase, assess its nature (unfinished code path, skipped validation, deferred security concern, or benign note), and either fix it in-sprint or convert it to a properly tracked issue with severity label. Do not leave it unclassified. |
| **Acceptance Criteria** | ① TODO/FIXME is located and its content documented in the PR description. ② If fixable in < 1 day: fix is implemented, tested, and merged. ③ If not fixable in-sprint: a GitHub Issue is opened with severity, owner, and reproduction steps. ④ The raw TODO/FIXME comment is removed from source in either case. |
| **Estimated Effort** | Low — 0.5–1 day |
| **Estimated Cost** | ~6 engineer-hours @ standard rate |
| **Risk Score** | 🟡 **Low-to-Medium** — risk is unknown until the TODO is inspected; could be trivial or could guard a security gap. Treat as medium until triaged. |
| **Source Signal** | Profile: `TODO/FIXME hits in source: 1` |
| **Dependencies** | Can run in parallel with TD-001 |

---

### 🔧 Tech Debt — TERTIARY (unblocked after TD-001 green)

| Field | Detail |
|-------|--------|
| **ID** | TD-002 |
| **Title** | Pin and audit all 4 Python dependencies in `ai-service/requirements.txt` |
| **Type** | `tech_debt` |
| **Description** | Review current versions of all 4 Python dependencies (FastAPI, Anthropic SDK, and others) in `ai-service/requirements.txt`. Pin each to an exact version. Run the full ai-service test suite (or smoke tests) after pinning to confirm no regressions. Document the pinned versions and rationale in the PR. |
| **Acceptance Criteria** | ① All 4 deps in `requirements.txt` are pinned to exact versions (e.g., `fastapi==0.111.0`, not `fastapi>=0.100`). ② CI (TD-001) passes with pinned deps. ③ No functional regressions in ai-service. ④ PR includes a comment block documenting the pinned version and the latest available version at time of pinning. |
| **Estimated Effort** | Low — 0.5–1 day |
| **Estimated Cost** | ~6 engineer-hours @ standard rate |
| **Risk Score** | 🟢 **Low** — purely defensive; reduces future breakage risk without changing behaviour |
| **Source Signal** | Profile: `ai-service/requirements.txt` (python — 4 deps) |
| **Dependencies** | TD-001 (CI must be green so pinning regressions surface automatically) |

---

## Deferred Items (Not in This Sprint)

| Item | Reason for Deferral |
|------|---------------------|
| **Complete the Portfolio Gift Workflow** | Cross-service feature (Next.js → Go → Python) with no CI safety net is an unacceptable merge risk. Deferred to next sprint once TD-001 is green and BUG-001 is resolved. This is the **highest-priority item for Sprint N+1**. |
| **Audit and Update npm Dependencies (`platform/package.json`)** | Medium risk of breaking API changes in the Next.js frontend; without CI there is no automated regression signal. Deferred until CI is operational. |

---

## Sprint Summary

| Metric | Value |
|--------|-------|
| **Sprint Duration** | 1 week |
| **Total Items** | 3 (1 tech-debt primary, 1 bug, 1 tech-debt tertiary) |
| **Feature Items** | 0 (feature deferred — foundation not ready) |
| **Tech Debt Items** | 2 |
| **Bug Items** | 1 |
| **Total Estimated Effort** | 3–5 days of engineering work |
| **Total Estimated Cost** | ~36 engineer-hours (≈ 3–5 days @ standard rate) |
| **Overall Sprint Risk Score** | 🟢 **Low** |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| TODO/FIXME conceals a security vulnerability | Low | High | Triage BUG-001 on Day 1; escalate immediately if security-relevant |
| CI setup takes longer than 3 days across 3 stacks | Medium | Medium | Timebox: ship a minimal 1-job-per-service CI first; iterate to full coverage in Sprint N+1 if needed |
| Python dep pinning reveals a version conflict | Low | Low | Run in a clean virtualenv before committing; CI will catch it |
| Portfolio gift workflow pressure causes scope creep | Medium | High | Hard rule: feature does not enter this sprint under any circumstances without operator approval via Decision Record |

---

## Execution Order

```
Day 1–3:  [TD-001] CI Pipeline setup ──────────────────────────────┐
Day 1–2:  [BUG-001] TODO/FIXME triage (parallel with TD-001) ──────┤
Day 3–4:  [TD-002] Pin Python deps (unblocked once CI is green) ───┘
Day 5:    Sprint review, retrospective, Sprint N+1 planning
          → Portfolio Gift Workflow enters Sprint N+1 as Item #1
```

---

## Sprint N+1 Preview (Committed Backlog)

Once this sprint's foundation items are green, the following items are pre-approved for the next sprint planning session:

1. **Complete the Portfolio Gift Workflow** — highest user-facing value; all prerequisites will be met
2. **Audit and Update npm Dependencies (`platform/package.json`)** — CI will provide the regression safety net needed

---

*Sprint proposal prepared by: Manager Agent (minions/manager)*
*Reviewed against: Technical Feasibility Assessment (Principal Engineer)*
*Decision Record required before execution: Yes — operator approval needed per Hard Rule 4*
