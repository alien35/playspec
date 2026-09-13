export function generateProposalMarkdown(slug: string, title: string): string {
  return `# Proposal: ${title}

## Overview
Briefly describe the motivation for this feature and the core problem it solves.

## User Personas & Roles
- **Primary Persona**: (e.g. Notary / Signer / Admin)
- **Secondary Roles**: (e.g. Witness, Organization Member)

## Scope & Impact
- **In Scope**:
  - What will be delivered in this change
- **Out of Scope**:
  - What is explicitly deferred to later milestones

## Reference & Tracking
- **Linear Issue**: (e.g. NOT-XXX)
- **Target Route**: (e.g. \`/dashboard\`, \`/customer/signing-room\`)
- **Backend Service**: (e.g. \`notary-java\`)
`;
}
