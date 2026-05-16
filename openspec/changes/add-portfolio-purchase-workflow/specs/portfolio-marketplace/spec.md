## ADDED Requirements

### Requirement: Portfolio product is available to authenticated users
The system SHALL show an AI Portfolio Website product to authenticated users from the dashboard and template marketplace.

#### Scenario: Dashboard shows portfolio product
- **WHEN** an authenticated user opens the dashboard
- **THEN** the system displays an AI Portfolio Website app option with name, description, starting plan information, and a call to start the gift flow

#### Scenario: User selects portfolio product
- **WHEN** an authenticated user selects the AI Portfolio Website product
- **THEN** the system routes the user to the portfolio intake flow

### Requirement: Portfolio product supports gift and self-gift modes
The system SHALL allow the buyer to indicate whether the portfolio website is for another recipient or for themselves.

#### Scenario: Buyer gifts to another person
- **WHEN** the buyer selects gift mode
- **THEN** the system captures recipient name and recipient context separately from buyer contact information

#### Scenario: Buyer gifts to themselves
- **WHEN** the buyer selects self-gift mode
- **THEN** the system may reuse buyer information as recipient information while still allowing edits

### Requirement: Portfolio template has a versioned manifest
The system SHALL define a `portfolio-website` template manifest that declares consumed config keys, AI content shape, and the MVP shared deployment target.

#### Scenario: Manifest is loaded
- **WHEN** the template registry loads manifests
- **THEN** it includes `portfolio-website` with version, display name, platform, consumed keys, and deployment metadata
