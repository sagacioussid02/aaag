# Sprint 0: Lay the Foundation

**Sprint Goal**: Establish CI foundation and stabilise dependencies to unblock safe cross-service delivery.

**Duration**: 1 sprint (1 week)  
**Team**: Sasha (engineer), Cloud DevOps team  
**Status**: Approved  

---

## Work Items

### Bugs (1)

#### 1. Investigate and Resolve the 1 Documented TODO/FIXME in Source

**Task ID**: ee12c5bd-2381-4ac8-a594-b895b241eafa  
**Owner**: Sasha (engineer)  
**Effort**: XS (1 day)  
**Status**: In Progress  

**Description**:  
A single unresolved TODO/FIXME may indicate an incomplete code path, deferred bug fix, or security gap in a marketplace/payment context. Time-boxing this now prevents it from compounding as the codebase grows.

**Acceptance Criteria**:
- [ ] TODO/FIXME is located and documented in `docs/TRIAGE_REPORT.md`.
- [ ] Assessment completed with severity and path-type categorization.
- [ ] Issue is either resolved with a passing test or escalated as a tracked issue with severity label.
- [ ] No new TODOs introduced.

**Deliverables**:
- `docs/TRIAGE_FRAMEWORK.md` — Triage framework for all TODO/FIXME annotations.
- `docs/TRIAGE_REPORT.md` — Initial triage report with findings.
- Tracked issue (if escalation required).

**Risks**:
- The TODO/FIXME may reside in the payment or gifting flow; if so, effort and risk escalate beyond the 1-day time-box and must be flagged immediately for re-scoping.

---

### Tech Debt (3)

#### 2. Set Up CI Pipeline (GitHub Actions) for Node, Go, and Python Runtimes

**Task ID**: TBD  
**Owner**: Cloud DevOps team  
**Effort**: M (3–4 days)  
**Status**: Not Started  

**Description**:  
CI is entirely absent, meaning no automated testing, linting, or build validation on any PR across the three-service system. This is the foundational blocker for safe delivery of every subsequent item this sprint and beyond.

**Acceptance Criteria**:
- [ ] GitHub Actions workflows exist for all three runtimes (Node 18+, Go 1.21+, Python 3.11+).
- [ ] Each job runs lint and unit tests on every PR targeting main.
- [ ] All three jobs pass green on a test PR.
- [ ] Required secrets (${ANTHROPIC_API_KEY} and others) are registered in GitHub repo secrets.

**Deliverables**:
- `.github/workflows/node.yml` — Node.js 18+ lint and test workflow.
- `.github/workflows/go.yml` — Go 1.21+ lint and test workflow.
- `.github/workflows/python.yml` — Python 3.11+ lint and test workflow.
- GitHub repo secrets configuration (operator action).

**Risks**:
- CI secrets must be registered in GitHub repo secrets before integration-test jobs can run — this is a configuration prerequisite that requires operator action and is not a code change.
- Cross-service coordination risk: CI workflow must correctly model the inter-service dependency graph to avoid false-green builds where one service compiles but integration points are broken.

**Blocking**: This item blocks all subsequent delivery work. Must be completed before Phase 1 begins.

---

#### 3. Pin and Audit the 4 Python Dependencies in ai-service/requirements.txt

**Task ID**: TBD  
**Owner**: Sasha (engineer)  
**Effort**: XS (1 day)  
**Status**: Not Started  

**Description**:  
Unpinned dependencies in the ai-service risk breaking the Claude integration pipeline or introducing vulnerabilities in a public-facing service; pinning is a prerequisite for production readiness of the gift workflow.

**Acceptance Criteria**:
- [ ] All 4 dependencies in `ai-service/requirements.txt` are pinned to explicit versions.
- [ ] No known CVEs exist for the pinned versions (verified via `pip-audit` or similar).
- [ ] Anthropic SDK version is confirmed compatible with the Claude model version called in code.
- [ ] ai-service starts and passes its existing tests with the pinned deps.

**Deliverables**:
- Updated `ai-service/requirements.txt` with pinned versions.
- Audit report (CVE check results).
- Test results confirming ai-service functionality.

**Risks**:
- Pinning may reveal incompatibilities with the current Claude model or FastAPI version; if so, escalate as a separate Decision Record.

**Blocking**: Blocks Phase 2 delivery (automated gift workflow). Must be completed before Phase 2 begins.

---

#### 4. Audit and Apply Patch/Minor Updates to the 12 npm Dependencies in platform/package.json

**Task ID**: TBD  
**Owner**: Sasha (engineer)  
**Effort**: S (2 days)  
**Status**: Not Started  

**Description**:  
Stale npm deps on the customer-facing Next.js 14 platform can introduce security vulnerabilities or incompatibilities; patch-level updates are safe and parallelisable with other sprint work.

**Acceptance Criteria**:
- [ ] `npm audit` reports zero high/critical vulnerabilities.
- [ ] All applied updates are patch or minor level only (Next.js major version boundary must not be crossed — stay within 14.x).
- [ ] Key flows pass manual smoke tests:
  - Landing page loads and renders correctly.
  - Wizard flow completes without errors.
  - Dashboard loads and displays user data.
- [ ] Any existing automated tests pass.

**Deliverables**:
- Updated `platform/package.json` and `platform/package-lock.json`.
- Audit report (`npm audit` output).
- Smoke test results.

**Risks**:
- npm audit may surface a dependency that requires a minor-version bump with behavioural changes in the Next.js App Router or fetch caching semantics; any such case must be deferred and raised as a separate Decision Record rather than merged this sprint.

**Blocking**: Does not block other work. Can be parallelised with items 2 and 3.

---

## Sprint Sequencing

```
Day 1–2: Item 1 (TODO/FIXME Triage) + Item 2 (CI Setup) in parallel
Day 2–3: Item 3 (Python Deps) + Item 4 (npm Deps) in parallel
Day 4–5: CI validation, testing, and operator approval
Day 5–6: Final review and merge
```

**Critical Path**: Item 2 (CI Setup) must complete and pass before any code changes can be safely merged.

---

## Success Metrics

- ✅ CI pipeline is green on all three runtimes.
- ✅ All dependencies are pinned and audited with zero high/critical CVEs.
- ✅ TODO/FIXME triage is complete with no unresolved critical items.
- ✅ All acceptance criteria met for each work item.
- ✅ No new TODOs introduced.
- ✅ Team is unblocked to begin Phase 1 delivery in the next sprint.

---

## Risks and Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| CI secrets not registered in time | High | Operator to register secrets before Day 2; DevOps to prepare workflow files in parallel. |
| TODO/FIXME escalates beyond 1-day time-box | Medium | Flag immediately if payment/auth path is affected; re-scope to Phase 2. |
| npm audit surfaces breaking change | Medium | Defer to separate Decision Record; do not merge if Next.js 14.x boundary is crossed. |
| Cross-service CI coordination fails | Medium | DevOps to model inter-service dependency graph explicitly; test with a multi-service PR. |
| Python dependency incompatibility | Low | Verify Anthropic SDK version against Claude model in code; escalate if mismatch found. |

---

## Dependencies and Blockers

- **External**: GitHub repo secrets must be registered by operator (${ANTHROPIC_API_KEY}, Stripe keys, etc.).
- **Internal**: Item 2 (CI) blocks all subsequent delivery work.
- **Sequencing**: Items 3 and 4 can proceed in parallel once Item 2 is in progress.

---

## Approval

**Proposed by**: Manager  
**Approved by**: Operator  
**Date**: [Sprint 0 Kickoff]  

---

## Notes

- This sprint establishes the foundation for safe, automated delivery across all three services.
- All work is grounded in observable project signals (TODO/FIXME markers, package ecosystems, CI absence).
- No ungrounded or invented work is included.
- Portfolio gift workflow (deferred) remains blocked until CI is green and Python deps are pinned; if either of those items slips, the gift workflow cannot safely enter the next sprint either.
