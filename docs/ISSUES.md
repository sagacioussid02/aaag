# Issue Tracking Log

Until a proper issue tracker is integrated, all tracked issues are logged here with severity, owner, and deadline.

## #AAAG-001: Implement Stripe Webhook Handler

**Severity:** CRITICAL  
**Service:** api/  
**Status:** Open  
**Owner (Infrastructure):** cloud_devops  
**Code Owner:** senior_engineer  
**Deadline:** Sprint 7  
**Issue Location:** `api/cmd/server/main.go` (line ~30)  

### Description

The Stripe webhook handler in the payment confirmation path is currently a stub that logs but does not process events. This is a silent failure mode: payment confirmations are not persisted, order status is not updated, and customers are not notified of successful purchases.

### Acceptance Criteria

1. ✅ Webhook signature validation (HMAC-SHA256 against Stripe signing secret)
2. ✅ Parse and validate webhook event payload
3. ✅ Update order status in database on `charge.succeeded` event
4. ✅ Trigger customer notification (email) on successful payment
5. ✅ Implement idempotency key handling to prevent duplicate processing
6. ✅ Log all webhook events to audit trail for compliance
7. ✅ Integration test validating end-to-end payment confirmation flow

### Dependencies

- Stripe API keys configured in `.env` (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET)
- Database schema for order status updates (see `supabase/migrations/001_init.sql`)
- Notification service integration (email provider TBD)
- CI pipeline must be green before implementation begins

### Notes

- This issue was triaged in Sprint 6 per decision record "Sprint 6 proposal for AaaG"
- Deferral is acceptable because CI does not yet exist; the fix will be the first item gated by the new pipeline
- Infrastructure owner (cloud_devops) is responsible for Stripe secret rotation and webhook routing; code owner (senior_engineer) is responsible for handler implementation
