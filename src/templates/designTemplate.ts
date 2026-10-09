export function generateDesignMarkdown(slug: string, title: string): string {
  return `# Technical Design: ${title}

## Architecture Overview
Outline the architectural approach across the stack (frontend, backend, database).

## Reality-Verified Sequence Diagram
_This diagram is automatically compiled from dual-stream runtime traces (causal pipeline logs + network boundaries) upon running \`playspec verify ${slug}\`._

<!-- PLAYSPEC:SEQUENCE_DIAGRAM:START -->
\`\`\`mermaid
sequenceDiagram
  autonumber
  actor User
  participant UI as Application UI
  Note over User,UI: Awaiting test verification (\`npx playspec verify ${slug}\`)
\`\`\`
<!-- PLAYSPEC:SEQUENCE_DIAGRAM:END -->

## Frontend Components & State (\`taskbox/\`)
- **Route**: \`app/...\`
- **UI Components**:
- **State Management & Hooks**:
- **Dev Auth Bypass**: Dev bypass headers or mock tokens used for fast local testing.

## Backend APIs (\`notary-java/\`)
- **Endpoints**:
  - \`POST /api/v1/...\`
  - \`GET /api/v1/...\`
- **Services & Repositories**:
- **Security / Guards**:

## Database & Schema (Supabase)
> ⚠️ **MIGRATION RULE**: All database migrations must be placed in \`taskbox/supabase/migrations/<timestamp>_<name>.sql\`.
> Never create migrations in \`notary-java/\` or root.
- **Tables Affected**:
- **RLS Policies / Triggers**:

## E2E Test Strategy (\`taskbox/e2e/\`)
- **Test File**: \`tests/${slug}.e2e.ts\`
- **Page Object**: \`pages/${slug}.page.ts\`
- **Fixture**: \`fixtures/${slug}.ts\`
- **Fast Mode Support**: Headless execution with \`E2E_FAST=true\` skipping screenshot overhead.
`;
}
