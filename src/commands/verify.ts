import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadConfig } from '../config.ts';
import { readJsonSafe, writeJsonSafe } from '../utils/fsUtils.ts';
import { c, printBanner, badge } from '../utils/formatting.ts';
import { runPlaywrightTest } from '../runner/playwrightRunner.ts';

export interface VerifyOptions {
  slug: string;
  fast?: boolean;
  headed?: boolean;
}

export async function runVerify(options: VerifyOptions): Promise<void> {
  const { slug, fast, headed } = options;
  const config = loadConfig();
  const changeDir = resolve(config.changesDir, slug);
  if (!existsSync(changeDir)) {
    console.error(c('red', `❌ Error: Change directory not found: ${changeDir}`));
    process.exit(1);
  }

  const metaPath = resolve(changeDir, 'meta.json');
  const meta = readJsonSafe<any>(metaPath, { slug, title: slug, status: 'in_progress' });

  printBanner(`Verify Feature: ${meta.title || slug}`, fast ? 'Fast mode (headless, skip screenshots)' : 'Standard mode (with screenshots & visual reports)');

  const testFile = `${slug}.e2e.ts`;
  const commandId = fast ? `e2e_${slug.replace(/-/g, '_')}_fast` : `e2e_${slug.replace(/-/g, '_')}`;

  const result = await runPlaywrightTest({
    testFile,
    fast,
    headed,
    commandId,
    title: `${meta.title || slug} (Verify)`,
  });

  if (result.success) {
    console.log(`\n${c('bold', c('brightGreen', '🎉 Verification Succeeded! All tests passed.'))}`);
    console.log(`Duration: ${result.durationSeconds.toFixed(2)}s\n`);

    meta.status = 'verified';
    meta.verifiedAt = new Date().toISOString();
    meta.lastVerification = {
      fast: !!fast,
      durationSeconds: result.durationSeconds,
    };

    if (config.diagrams?.enabled !== false) {
      const { compileSequenceDiagram } = await import('../generator/diagramService.ts');
      const diagResult = compileSequenceDiagram(slug, config, result.rawOutput);
      if (diagResult.success && diagResult.graph) {
        meta.sequenceDiagram = {
          generatedAt: new Date().toISOString(),
          interactionCount: diagResult.graph.interactions.length,
          participants: diagResult.graph.participants.map((p) => p.id),
        };
        console.log(`  ${badge('green', 'diagram generated')} Updated reality-verified sequence diagram in ${c('bold', `changes/${slug}/design.md`)} (${diagResult.graph.interactions.length} interactions)`);
      } else {
        console.log(`  ${badge('gray', 'diagram skipped')} ${diagResult.message || 'No runtime trace events captured.'}`);
      }
    }

    writeJsonSafe(metaPath, meta);

    console.log(`${badge('green', 'meta.json updated')} status: ${c('bold', 'verified')}`);
    console.log(`\nNext step to finalize and merge into living specs:`);
    console.log(`  ${c('cyan', `$ npx playspec archive ${slug}`)}\n`);
  } else {
    console.log(`\n${c('bold', c('brightRed', '❌ Verification Failed'))}`);
    if (result.errorHeadline) {
      console.log(`\n${c('bold', 'Failure Summary:')}`);
      console.log(`  ${c('red', result.errorHeadline)}`);
    }
    if (result.errorSummary) {
      console.log(`\n${c('dim', result.errorSummary)}`);
    }

    meta.status = 'failing';
    meta.lastFailure = {
      occurredAt: new Date().toISOString(),
      durationSeconds: result.durationSeconds,
      errorHeadline: result.errorHeadline,
    };
    writeJsonSafe(metaPath, meta);

    console.log(`\n${badge('red', 'meta.json updated')} status: ${c('bold', 'failing')}`);
    console.log(`Check the output above or inspect Playwright reports to debug.\n`);
    process.exit(1);
  }
}
