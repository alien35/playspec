import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadConfig } from '../config.ts';
import { readJsonSafe, writeJsonSafe } from '../utils/fsUtils.ts';
import { c, printBanner, badge } from '../utils/formatting.ts';
import { runPlaywrightTest } from '../runner/playwrightRunner.ts';

export async function runRedPhase(slug: string): Promise<void> {
  const config = loadConfig();
  const changeDir = resolve(config.changesDir, slug);
  if (!existsSync(changeDir)) {
    console.error(c('red', `❌ Error: Change directory not found: ${changeDir}`));
    process.exit(1);
  }

  const metaPath = resolve(changeDir, 'meta.json');
  const meta = readJsonSafe<any>(metaPath, { slug, status: 'red' });

  printBanner(`Red Phase: ${meta.title || slug}`, 'Asserting clean failure of unbuilt requirement');

  const testFile = `${slug}.e2e.ts`;
  const commandId = `e2e_${slug.replace(/-/g, '_')}_fast`;

  console.log(`${c('cyan', 'ℹ')} Running test in headless fast mode to assert unmet specification...`);
  const result = await runPlaywrightTest({
    testFile,
    fast: true,
    commandId,
    title: `${meta.title || slug} (Red Phase)`,
  });

  if (!result.success) {
    console.log(`\n${c('bold', c('brightGreen', '🎯 Red Phase Confirmed!'))}`);
    console.log(`The test failed as expected because the feature is not yet built.`);
    if (result.errorHeadline) {
      console.log(`\n${c('bold', 'Target Assertion / Failure Reason:')}`);
      console.log(`  ${c('brightRed', result.errorHeadline)}`);
    }

    meta.status = 'red_confirmed';
    meta.redPhase = {
      confirmedAt: new Date().toISOString(),
      durationSeconds: result.durationSeconds,
      errorHeadline: result.errorHeadline,
    };
    writeJsonSafe(metaPath, meta);

    console.log(`\n${badge('green', 'meta.json updated')} status: ${c('bold', 'red_confirmed')}`);
    console.log(`\nNext: Implement the feature and run:`);
    console.log(`  ${c('cyan', `$ npx playspec verify ${slug} --fast`)}\n`);
  } else {
    console.log(`\n${c('bold', c('yellow', '⚠️ Warning: Test Passed in Red Phase!'))}`);
    console.log(`A Red Phase test is expected to fail against unbuilt requirements.`);
    console.log(`Please verify that:`);
    console.log(`  1. The test has assertions checking for the new behavior in ${c('bold', `${config.e2e.testsDir}/${slug}.e2e.ts`)}`);
    console.log(`  2. The page object locators target the actual new elements in ${c('bold', `${config.e2e.pagesDir}/${slug}.page.ts`)}\n`);
  }
}
