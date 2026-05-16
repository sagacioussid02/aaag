## ADDED Requirements

### Requirement: Portfolio intake accepts PDF source documents
The system SHALL accept a required resume PDF and an optional cover letter PDF during portfolio intake.

#### Scenario: User uploads valid PDF resume
- **WHEN** the user uploads a PDF resume within the configured size limit
- **THEN** the system stores the file reference and allows the user to continue

#### Scenario: User uploads unsupported document
- **WHEN** the user uploads a non-PDF document during the MVP intake
- **THEN** the system rejects the file with a clear validation error

### Requirement: Portfolio intake captures freeform user notes
The system SHALL allow the user to add optional freeform instructions, achievements, links, tone preferences, and any details they want included.

#### Scenario: User adds notes
- **WHEN** the user enters optional notes during intake
- **THEN** the system includes those notes in the portfolio generation request

### Requirement: AI generates structured portfolio configuration
The system SHALL generate a structured portfolio config from resume PDF, optional cover letter PDF, and user notes.

#### Scenario: AI generation succeeds
- **WHEN** valid portfolio intake inputs are submitted
- **THEN** the system returns structured profile, experience, projects, skills, education, contact, theme, and source-summary fields

#### Scenario: AI generation fails
- **WHEN** the AI service cannot generate structured portfolio data
- **THEN** the system shows a recoverable error and preserves the uploaded file references and user-entered notes

### Requirement: User can review extracted portfolio data beside preview
The system SHALL show extracted/customizable portfolio fields side by side with a live preview of the portfolio website.

#### Scenario: Preview renders generated data
- **WHEN** generated portfolio data is available
- **THEN** the system displays editable extracted details on one side and a portfolio preview reflecting those details on the other side

#### Scenario: User edits extracted data
- **WHEN** the user edits profile, experience, project, skill, or theme fields
- **THEN** the preview updates to reflect the edited portfolio configuration before plan selection

### Requirement: Portfolio config is template-driven
The system SHALL represent the portfolio website as a versioned structured configuration that can be rendered by the shared template.

#### Scenario: Config is persisted
- **WHEN** the user approves the preview
- **THEN** the system stores the portfolio config with template slug, version, buyer/recipient metadata, theme, source document references, and generated content
