export function generateSpecMarkdown(slug: string, title: string): string {
  return `# Specifications: ${title}

## Overview
Executable specifications for ${title}. Each requirement maps directly to Playwright E2E test assertions and phases.

---

### Requirement 1: Primary Happy Path
The application SHALL allow the user to complete the core journey for this feature.

#### Scenario 1.1: Core user action succeeds
- **GIVEN** an authenticated user session on the target screen
- **WHEN** the user provides valid inputs and triggers the primary action
- **THEN** the application submits the request successfully
- **AND** displays the updated state or confirmation view
- **PLAYWRIGHT_PHASE**: \`1. Navigate to target screen\` -> \`2. Fill inputs\` -> \`3. Submit and assert confirmation\`

---

### Requirement 2: Error Handling & Form Validation
The application SHALL prevent submission and display actionable errors when invalid data is provided.

#### Scenario 2.1: Missing required field
- **GIVEN** the feature form is visible
- **WHEN** the user attempts to submit without required inputs
- **THEN** an inline validation message appears without making a network request
- **PLAYWRIGHT_PHASE**: \`4. Validation error assertion\`

---

### Requirement 3: Network & Reload Resilience
The application SHALL preserve or gracefully recover state upon browser reload or network hiccups.

#### Scenario 3.1: Browser reload retains session state
- **GIVEN** the user has progressed through step 1
- **WHEN** the browser window is reloaded
- **THEN** current progress and session state remain preserved
- **PLAYWRIGHT_PHASE**: \`5. Reload resilience assertion\`
`;
}
