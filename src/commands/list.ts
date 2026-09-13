import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadConfig } from '../config.ts';
import { readJsonSafe, listDirs } from '../utils/fsUtils.ts';
import { c, printBanner, badge } from '../utils/formatting.ts';

export function runList(): void {
  const config = loadConfig();
  printBanner('PlaySpec Status', 'Active feature changes & living specifications');

  const activeDirs = listDirs(config.changesDir).filter((d) => d !== 'archive');

  if (activeDirs.length === 0) {
    console.log(`  ${c('dim', 'No in-flight changes found in ' + config.changesDir.replace(process.cwd() + '/', '') + '/')}`);
    console.log(`  Run ${c('cyan', 'npx playspec propose <slug>')} to start a new feature.\n`);
  } else {
    console.log(`${c('bold', 'Active Feature Changes:')}\n`);
    for (const slug of activeDirs) {
      const meta = readJsonSafe<any>(resolve(config.changesDir, slug, 'meta.json'), {
        slug,
        title: slug,
        status: 'unknown',
      });

      let statusBadge = badge('gray', meta.status);
      if (meta.status === 'red' || meta.status === 'red_confirmed') {
        statusBadge = badge('red', meta.status.replace('_', ' '));
      } else if (meta.status === 'in_progress') {
        statusBadge = badge('yellow', 'in progress');
      } else if (meta.status === 'verified') {
        statusBadge = badge('green', 'verified');
      } else if (meta.status === 'failing') {
        statusBadge = badge('red', 'failing');
      }

      console.log(`  • ${c('bold', meta.title || slug)} (${c('dim', slug)})`);
      console.log(`    Status: ${statusBadge}`);
      if (meta.files?.test) {
        console.log(`    Test:   ${c('cyan', meta.files.test)}`);
      }
      console.log('');
    }
  }

  const livingSpecsCount = existsSync(config.livingSpecsDir)
    ? readdirSync(config.livingSpecsDir).filter((f) => f.endsWith('.md')).length
    : 0;

  const archivedCount = existsSync(config.archiveDir)
    ? listDirs(config.archiveDir).length
    : 0;

  console.log(`${c('cyan', '─'.repeat(50))}`);
  console.log(`  Living Specifications: ${c('bold', livingSpecsCount.toString())} in ${c('dim', 'specs/features/')}`);
  console.log(`  Archived Changes:      ${c('bold', archivedCount.toString())} in ${c('dim', 'changes/archive/')}`);
  console.log(`${c('cyan', '─'.repeat(50))}\n`);
}
