## ADDED Requirements

### Requirement: Dashboard shows portfolio build status
The system SHALL show each user's portfolio app build status in the dashboard.

#### Scenario: Build is queued
- **WHEN** the build request has been created but not completed
- **THEN** the dashboard displays the portfolio app as queued or generating with selected plan and last status update time

#### Scenario: Build is live
- **WHEN** the portfolio app has a public URL
- **THEN** the dashboard displays the app as live with a link to view it

### Requirement: Build lifecycle is logged
The system SHALL capture user-visible build lifecycle logs for portfolio generation and deployment.

#### Scenario: Status changes
- **WHEN** a portfolio build moves through queued, generating, deploying, live, or failed states
- **THEN** the system records timestamped log entries visible from the app status page

#### Scenario: Build fails
- **WHEN** portfolio generation or deployment fails
- **THEN** the system records the failure status and a user-safe log message that explains what happened

### Requirement: Internal metrics and cost are tracked
The system SHALL track estimated internal cost and operational metrics for each portfolio build.

#### Scenario: AI generation cost is estimated
- **WHEN** AI generation completes
- **THEN** the system records estimated token usage or generation cost in the build metrics

#### Scenario: Deployment cost placeholder is recorded
- **WHEN** MVP shared-template deployment is requested
- **THEN** the system records a deployment cost estimate or placeholder value for later reconciliation

### Requirement: Dashboard notification is available for MVP
The system SHALL provide dashboard-visible notification state when a portfolio app is ready.

#### Scenario: Portfolio becomes ready
- **WHEN** the portfolio app reaches live status
- **THEN** the dashboard marks the app as ready and surfaces the public URL

#### Scenario: Email notification is not yet implemented
- **WHEN** the MVP build completes
- **THEN** the system does not require email delivery, but the build task list tracks email notification as a follow-up
