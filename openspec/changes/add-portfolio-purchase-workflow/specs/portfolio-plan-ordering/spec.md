## ADDED Requirements

### Requirement: Portfolio plans are selectable without payment in MVP
The system SHALL allow users to select a plan and continue without Stripe payment during the MVP demo.

#### Scenario: User selects free trial
- **WHEN** the user selects the free trial plan
- **THEN** the system creates an order/build request with a two-day expiration policy and no payment requirement

#### Scenario: User selects one-time plan
- **WHEN** the user selects the one-time plan
- **THEN** the system creates an order/build request marked as selected for public deployment and pending manual payment integration

#### Scenario: User selects managed plan
- **WHEN** the user selects the managed plan
- **THEN** the system creates an order/build request marked as selected for public deployment and future maintenance/traffic pricing

### Requirement: Plan selection creates a build request
The system SHALL create a portfolio build request after plan selection and route the user to a status page.

#### Scenario: Build request is created
- **WHEN** the user confirms a plan
- **THEN** the system creates records for order, app/build status, selected plan, portfolio config snapshot, and initial log entries

#### Scenario: User reaches confirmation page
- **WHEN** the build request has been created
- **THEN** the system shows a page telling the user they will be notified when the app is ready to view

### Requirement: Pricing model preserves future deployment options
The system SHALL store enough plan/deployment intent to support both shared-template and per-customer-repository charging models later.

#### Scenario: MVP uses shared template
- **WHEN** a portfolio order is created during MVP
- **THEN** the system records `shared_template` as the deployment strategy

#### Scenario: Future repo option is introduced
- **WHEN** per-customer repositories are added later
- **THEN** existing shared-template portfolio orders remain distinguishable from repo-backed orders
