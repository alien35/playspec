export function generateTasksMarkdown(slug: string, title: string): string {
  return `# Tasks: ${title}

## 1. Specification & Scaffolding
- [x] 1.1 Scaffold feature change directory (\`changes/${slug}/\`)
- [x] 1.2 Scaffold Playwright test suite (\`taskbox/e2e/tests/${slug}.e2e.ts\`)
- [x] 1.3 Register npm test scripts in \`taskbox/package.json\`
- [x] 1.4 Register command card in \`command-launcher/commands.json\`

## 2. Red Phase (Assertion of Missing Feature)
- [ ] 2.1 Run \`npx playspec red ${slug}\`
- [ ] 2.2 Verify the test fails cleanly at the expected unbuilt UI element or API endpoint

## 3. Implementation (Green Phase)
- [ ] 3.1 Database: Create Supabase migration in \`taskbox/supabase/migrations/\` (if needed)
- [ ] 3.2 Backend: Implement API endpoints & services in \`notary-java/\`
- [ ] 3.3 Frontend: Build UI views & routes in \`taskbox/\`
- [ ] 3.4 Wire up client API calls and error handling

## 4. Verification & Polish
- [ ] 4.1 Run fast-mode test: \`npx playspec verify ${slug} --fast\`
- [ ] 4.2 Run visual report test: \`npx playspec verify ${slug}\` (screenshots & performance report)
- [ ] 4.3 Ensure no regressions in related E2E suites

## 5. Archive & Living Documentation
- [ ] 5.1 Run \`npx playspec archive ${slug}\`
- [ ] 5.2 Confirm living spec updated in \`specs/features/${slug}.md\`
- [ ] 5.3 Confirm \`taskbox/e2e/README.md\` updated with milestone summary
`;
}
