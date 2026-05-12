# Contributing to AaaG

## Branch Naming Convention

All work is done on feature branches following this pattern:

```
minions/<role>/<short-summary>
```

Examples:
- `minions/engineer/ci-github-actions`
- `minions/engineer/dependency-audit`
- `minions/engineer/todo-triage`

**Never commit directly to `main` or `master`.** Branch protection enforces this server-side.

## Pull Request Process

1. Create a branch from `main` using the naming convention above.
2. Make your changes and commit with clear, conventional commit messages.
3. Open a PR targeting `main`.
4. A peer engineer reviews your work first.
5. Once peer approval is granted and CI is green, the operator reviews.
6. Do not merge your own work — wait for operator approval.

## Sprint Structure

See [SPRINT_N.md](SPRINT_N.md) for the current sprint plan, including:
- Sprint goal and items
- Effort estimates and risk assessment
- Sequencing across multiple sprints

## TODO/FIXME Triage Framework

All TODO and FIXME annotations in the codebase are categorized using the framework in [docs/TRIAGE_FRAMEWORK.md](docs/TRIAGE_FRAMEWORK.md).

When adding a new TODO or FIXME:
1. Include a brief description of the issue.
2. Tag it with the appropriate severity (critical, high, low).
3. Indicate the path type (payment, auth, data, UI, infra, other).
4. If it affects payment or auth paths, note that it is blocked from fixing until CI is green.

Example:
```go
// TODO(critical, auth): validate JWT expiry before processing requests
// Blocked until CI is green and auth path is fully tested.
```

## Code Review Standards

- All changes must pass linting and tests in CI.
- Documentation changes must be clear and link to relevant sections.
- No secrets or credentials should be committed; use environment variables instead.
- Changes to dependencies must be audited and pinned to specific versions.

## Questions?

Refer to the sprint plan or triage framework. If you need clarification on sprint scope or TODO categorization, ask during sprint standup or in the PR review.
