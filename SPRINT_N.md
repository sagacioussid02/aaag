# AaaG — Sprint N: Foundation First

**Sprint Name:** Foundation First  
**Sprint Duration:** 1 week  
**Prepared by:** Manager (minions/manager)  
**Status:** Approved — Execution in Progress  

---

## Sprint Goal

Establish the foundational quality infrastructure (CI pipeline, dependency hygiene, known-defect resolution) that unblocks the portfolio gift workflow feature in Sprint N+1. One feature item is included per sprint contract; per feasibility review, the portfolio gift workflow is deferred one sprint to avoid compounding risk — the feature slot is filled by the CI pipeline, which is the highest-impact deliverable available without unmet prerequisites.

> **Note on Feature Slot:** The portfolio gift workflow (the natural feature candidate) has a hard dependency on CI and audited AI-service dependencies. Shipping it this sprint would mean integrating a cross-service feature with no automated quality gate and unaudited Claude SDK bindings — a compounding risk the principal engineer has flagged as **High**. The CI pipeline is reclassified as the sprint's feature-equivalent deliverable given its foundational, user-value-enabling impact.

---

## Sprint Items

### 🚀 Feature Item

| Field | Detail |
|---|---|
| **ID** | `AAAG-F01` |
| **Title** | Configure CI/CD pipeline for automated testing and linting |
| **Type** | `feature` (foundational infrastructure) |
| **Source** | `CI configured: False` — project profile, CI section |
| **Description** | Author GitHub Actions workflows for all three runtimes: Node.js (platform), Go (api), and Python (ai-service). Each workflow covers lint, unit tests, and build validation on every PR. Secrets (`${ANTHROPIC_API_KEY}`, Supabase credentials) must be registered in GitHub repo settings before integration-test jobs can run; unit/lint jobs proceed immediately. |
| **Effort Estimate** | Medium — 2–3 days |
| **Acceptance Criteria** | PRs to `main` are blocked unless all three workflow jobs (Node.js, Go, Python) pass. Lint and unit-test steps are green on the current codebase. |
| **Risk** | 🟢 **Low** — Additive, non-breaking. Main risk is initial setup time and sparse test coverage causing flaky runs. |

---

### 🔧 Tech-Debt Item

| Field | Detail |
|---|---|
| **ID** | `AAAG-TD01` |
| **Title** | Audit and update Python AI-service dependencies (`ai-service/requirements.txt`) |
| **Type** | `tech_debt` |
| **Source** | `ai-service/requirements.txt (python — 4 deps)` — package files section |
| **Description** | Review all 4 Python packages for available updates. Priority: `anthropic` SDK (breaking changes across versions; Claude model compatibility) and `fastapi` (security patches). Run changelog review, update `requirements.txt`, and smoke-test the AI service endpoints. If the `anthropic` SDK has a major version bump, audit prompt construction and response parsing code for required changes. |
| **Effort Estimate** | Small — 0.5–1 day |
| **Acceptance Criteria** | All 4 deps are at latest stable versions (or a documented, justified pin). AI-service smoke test passes against updated deps. No known CVEs in dependency set. |
| **Risk** | 🟡 **Low-to-Medium** — Small surface (4 packages), but `anthropic` SDK has a history of breaking changes; changelog review is mandatory before upgrading. |

---

### 🐛 Bug / Known-Defect Items

#### Bug Item 1

| Field | Detail |
|---|---|
| **ID** | `AAAG-BUG01` |
| **Title** | Investigate and resolve the 1 documented TODO/FIXME in source code |
| **Type** | `bug` (classification may change upon discovery) |
| **Source** | `TODO/FIXME hits in source: 1` — project profile, source analysis section |
| **Description** | Locate the single TODO/FIXME hit in the codebase. Assess severity and code path (payments, auth, or other). Either resolve inline if straightforward (≤ 0.5 day effort), or convert to a tracked issue with severity label and acceptance criteria if resolution requires cross-service coordination. Do not close without a documented outcome. |
| **Effort Estimate** | Small — 0.5–1 day |
| **Acceptance Criteria** | TODO/FIXME is either (a) resolved with a passing test covering the previously-skipped path, or (b) converted to a tracked issue with severity, owner, and sprint assignment. Zero undocumented TODOs remain. |
| **Risk** | 🟡 **Low-to-Medium** — Discovery is low-risk. Resolution risk is unknown until the TODO is located; if it sits in a payments or auth code path, risk escalates to Medium. |

---

### 📋 Deferred Item (Logged for Sprint N+1)

| Field | Detail |
|---|---|
| **ID** | `AAAG-F02` |
| **Title** | Finish and stabilize the portfolio gift workflow (draft → production-ready) |
| **Type** | `feature` |
| **Deferred Reason** | Hard prerequisites unmet: no CI pipeline, unaudited AI-service deps, unconfirmed Supabase migration tooling. Cross-service integration surface (Next.js → Go/Gin → FastAPI → Supabase) is too wide to ship safely without automated quality gates. Scheduled for Sprint N+1 once `AAAG-F01` and `AAAG-TD01` are complete. |
| **Risk if Attempted Now** | 🔴 **High** |

---

## Sprint Summary

| Item | ID | Type | Effort | Risk |
|---|---|---|---|---|
| Configure CI/CD pipeline | `AAAG-F01` | Feature (infra) | 2–3 days | 🟢 Low |
| Audit Python AI-service deps | `AAAG-TD01` | Tech Debt | 0.5–1 day | 🟡 Low-Medium |
| Resolve TODO/FIXME | `AAAG-BUG01` | Bug | 0.5–1 day | 🟡 Low-Medium |

**Total Estimated Effort:** 3–5 engineering days  
**Team Capacity Assumption:** 1 engineer × 5-day sprint (buffer for review cycles, PR overhead, and unexpected TODO complexity)

---

## Estimated Cost

| Cost Driver | Estimate | Basis |
|---|---|---|
| Engineering time (3–5 dev-days) | ~$1,500–$2,500 | Blended rate ~$500/day (mid-level engineer) |
| CI compute (GitHub Actions minutes) | ~$0–$10/month | Free tier likely sufficient for this repo size; Actions minutes for 3 runtimes on PRs |
| Dependency tooling | $0 | `npm audit`, `pip list --outdated` — no paid tooling required |
| **Total Sprint Cost (one-time)** | **~$1,500–$2,510** | |

> Cost estimate is indicative. Actual engineering rate should be substituted by the operator. CI compute cost is ongoing but negligible at this repo scale.

---

## Sprint Risk Score

### Overall Sprint Risk: 🟡 **MEDIUM**

| Risk Factor | Score | Notes |
|---|---|---|
| CI setup (AAAG-F01) | 🟢 Low | Additive, well-understood work; no production surface touched |
| Python dep audit (AAAG-TD01) | 🟡 Low-Medium | `anthropic` SDK breaking-change history is the primary concern |
| TODO/FIXME resolution (AAAG-BUG01) | 🟡 Low-Medium | Unknown content; payments/auth path would escalate risk |
| No CI at sprint start | 🟡 Medium | All PRs this sprint merge without automated gates until AAAG-F01 lands; **AAAG-F01 should be merged first** |
| Portfolio gift workflow deferred | ✅ Mitigated | Deferral eliminates the highest-risk item from this sprint |

**Composite:** The sprint itself is low-complexity, but the absence of CI at the start of the sprint means the first two PRs (before AAAG-F01 merges) rely on manual review alone. Recommended mitigation: **merge AAAG-F01 first**, before any other sprint PRs land.

---

## Sequencing Recommendation

```
Day 1–3:  [AAAG-F01] CI Pipeline  ← merge first; gates all subsequent PRs
Day 1–2:  [AAAG-TD01] Python dep audit  ← can run in parallel; PR held until CI is green
Day 3–4:  [AAAG-BUG01] TODO/FIXME investigation & resolution
Day 5:    Sprint review, retrospective, Sprint N+1 planning (portfolio gift workflow)
```

---

## Sprint N+1 Preview

Once this sprint closes with green CI and audited dependencies, the portfolio gift workflow (`AAAG-F02`) is unblocked. Sprint N+1 should also include:
- Confirm/establish Supabase migration tooling before schema changes land
- npm dependency audit (`platform/package.json`, 12 deps) — low effort, can be parallelized

---

*This sprint has been approved by the operator. Execution is in progress.*
