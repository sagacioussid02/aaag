# Tracked Issues

This document tracks all open issues with explicit owner and deadline.

## #AAAG-001: Implement Stripe Webhook Signature Validation and Payment Confirmation

**Status**: Open

**Priority**: CRITICAL

**Owner**: cloud_devops

**Deadline**: Sprint 7

**Created**: Sprint 6

**Description**: The Stripe webhook handler for payment confirmation is a stub that logs the event but does not validate the webhook signature or process the payment confirmation. This creates a silent failure mode where orders are recorded in the database but payment confirmation is never validated, potentially allowing unpaid orders to trigger app deployments.

**Location**: `api/cmd/server/main.go` (~line 145)

**Service**: api/ (Go + Gin)

**Path Type**: payment

**Risk Level**: CRITICAL

**Acceptance Criteria**:
- [ ] Stripe webhook signature is validated using the signing secret from environment variable
- [ ] Payment confirmation updates the order status in the database from "pending" to "confirmed"
- [ ] Failed payments trigger a notification to the customer via email
- [ ] Integration test covers the full payment confirmation flow (valid and invalid signatures)
- [ ] Webhook handler is idempotent (safe to replay duplicate events)
- [ ] Webhook handler logs all events for audit trail

**Blocked By**:
- CI pipeline must be operational
- Payment path integration tests must be in place

**Blocking**:
- None (issue is deferred, not blocking current sprint)

**Notes**:
- This issue was identified during Sprint 6 TODO/FIXME triage
- Implementation should follow the Stripe webhook best practices: https://stripe.com/docs/webhooks
- Webhook secret should be stored in environment variable `STRIPE_WEBHOOK_SECRET`
- See docs/TRIAGE_REPORT.md for full triage context
