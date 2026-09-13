import { existsSync, readdirSync } from 'node:fs';
import { loadConfig } from '../config.ts';
import { c, printBanner } from '../utils/formatting.ts';

export function runExplore(query?: string): void {
  const config = loadConfig();
  printBanner('PlaySpec Explore', 'Inspect existing E2E specs, page objects, and feature boundaries');

  console.log(`Explore existing features and tests in the repository:\n`);

  const existingTests = existsSync(config.e2e.testsDir)
    ? readdirSync(config.e2e.testsDir).filter((f) => f.endsWith('.e2e.ts'))
    : [];

  const existingPages = existsSync(config.e2e.pagesDir)
    ? readdirSync(config.e2e.pagesDir).filter((f) => f.endsWith('.page.ts'))
    : [];

  const existingSpecs = existsSync(config.livingSpecsDir)
    ? readdirSync(config.livingSpecsDir).filter((f) => f.endsWith('.md'))
    : [];

  if (query) {
    const q = query.toLowerCase();
    const matchedTests = existingTests.filter((t) => t.toLowerCase().includes(q));
    const matchedPages = existingPages.filter((p) => p.toLowerCase().includes(q));
    const matchedSpecs = existingSpecs.filter((s) => s.toLowerCase().includes(q));

    console.log(`${c('bold', `Search Results for "${query}":`)}\n`);
    console.log(`  Matching Tests: ${matchedTests.length > 0 ? matchedTests.join(', ') : c('dim', 'none')}`);
    console.log(`  Matching Pages: ${matchedPages.length > 0 ? matchedPages.join(', ') : c('dim', 'none')}`);
    console.log(`  Matching Specs: ${matchedSpecs.length > 0 ? matchedSpecs.join(', ') : c('dim', 'none')}\n`);
  } else {
    console.log(`${c('bold', 'Available E2E Test Suites')} (${existingTests.length} total):`);
    for (const test of existingTests.slice(0, 10)) {
      console.log(`  • ${test.replace('.e2e.ts', '')} (${c('dim', `${config.e2e.dir.replace(process.cwd() + '/', '')}/tests/${test}`)})`);
    }
    if (existingTests.length > 10) {
      console.log(`  ${c('dim', `... and ${existingTests.length - 10} more`)}`);
    }
    console.log('');
  }

  console.log(`${c('bold', 'How to Propose a New Feature:')}`);
  console.log(`  1. Pick a descriptive slug: e.g. ${c('cyan', 'document-expiry')} or ${c('cyan', 'team-invitations')}`);
  console.log(`  2. Run: ${c('cyan', 'npx playspec propose <slug> --title "Your Title"')}`);
  console.log(`  3. This generates the spec, Playwright test scaffold, and registers the test scripts.\n`);
}
