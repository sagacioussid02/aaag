# Issue Tracker

## Sprint 6 Issues

### #AAAG-001: Triage and resolve the single open TODO/FIXME in source
**Status**: In Progress  
**Assigned to**: engineer  
**Deadline**: Sprint 6 (before CI goes green)  
**Severity**: Critical  
**Path Type**: payment, app_lifecycle  

**Description**:  
One TODO/FIXME exists in a codebase handling orders, payments, and app lifecycle. In this context, a single deferred stub can represent a silent payment failure or undelivered app.

**Acceptance Criteria**:
- [x] TODO/FIXME located and documented
- [x] Service and severity documented
- [x] Deferred TODOs converted to tracked issues with explicit owner and deadline
- [ ] CI pipeline validates all changes

**Related Issues**: #AAAG-002, #AAAG-003, #AAAG-004

---

### #AAAG-002: Implement order creation payment path
**Status**: Backlog  
**Assigned to**: senior_engineer  
**Deadline**: Sprint 7  
**Severity**: High  
**Path Type**: payment  
**Code Location**: `api/cmd/server/main.go` (order creation endpoint stub)  

**Description**:  
The `/orders` endpoint currently contains a TODO stub for payment processing. This must be implemented with full payment validation, error handling, and integration with Stripe.

**Acceptance Criteria**:
- [ ] Order creation endpoint processes payment requests
- [ ] Stripe API integration is functional
- [ ] Payment validation and error handling are in place
- [ ] Integration tests validate the order creation → payment flow
- [ ] Idempotency is enforced (duplicate orders are rejected)

**Blocked Until**: CI pipeline is green (Sprint 6)

---

### #AAAG-003: Implement Stripe webhook handler for payment confirmation
**Status**: Backlog  
**Assigned to**: senior_engineer  
**Deadline**: Sprint 7  
**Severity**: Critical  
**Path Type**: payment  
**Code Location**: `api/cmd/server/main.go` (webhook handler stub)  

**Description**:  
The `/webhooks/stripe` endpoint is a stub that logs events but does not process them. This is the critical path for payment confirmation and must be fully implemented with signature validation, status updates, notifications, and audit logging.

**Acceptance Criteria**:
- [ ] Webhook signature validation is implemented (per Stripe security requirements)
- [ ] Payment status is updated in the database on webhook receipt
- [ ] Customer notifications are sent on payment confirmation
- [ ] Integration tests validate the webhook flow end-to-end
- [ ] Idempotency is enforced (duplicate webhook events are handled safely)
- [ ] All webhook events are logged for audit purposes

**Blocked Until**: CI pipeline is green (Sprint 6)

---

### #AAAG-004: Implement app deployment endpoint
**Status**: Backlog  
**Assigned to**: senior_engineer  
**Deadline**: Sprint 7  
**Severity**: High  
**Path Type**: app_lifecycle  
**Code Location**: `api/cmd/server/main.go` (deployment endpoint stub)  

**Description**:  
The `/apps/deploy` endpoint is a TODO stub for app deployment. This must be implemented to trigger template deployment to Vercel and return a live micro-app link to the customer.

**Acceptance Criteria**:
- [ ] Deployment endpoint triggers Vercel deployment
- [ ] Live micro-app link is returned to the customer
- [ ] Deployment status is tracked in the database
- [ ] Integration tests validate the deployment flow
- [ ] Error handling covers deployment failures and timeouts

**Blocked Until**: CI pipeline is green (Sprint 6)

---

## Sprint 6 Triage Summary

**Total Issues Filed**: 4  
**Critical**: 1 (#AAAG-003 — Stripe webhook handler)  
**High**: 2 (#AAAG-002, #AAAG-004)  
**Blocked Until**: CI pipeline is green  

**Sequencing**:
1. Sprint 6: Triage complete, CI pipeline deployed, all changes validated under CI
2. Sprint 7: Implement #AAAG-002, #AAAG-003, #AAAG-004 with full test coverage

**Owner Clarification**:  
All code changes to `api/cmd/server/main.go` are owned by `senior_engineer` (API service owner). The `cloud_devops` role owns the CI pipeline infrastructure (#AAAG-001 triage task is owned by `engineer` for documentation and issue filing).
