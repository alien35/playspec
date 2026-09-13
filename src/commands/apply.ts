import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadConfig } from '../config.ts';
import { readFileSafe, readJsonSafe } from '../utils/fsUtils.ts';
import { c, printBanner } from '../utils/formatting.ts';

export function runApply(slug: string): void {
  const config = loadConfig();
  const changeDir = resolve(config.changesDir, slug);
  if (!existsSync(changeDir)) {
    console.error(c('red', `❌ Error: Change directory not found: ${changeDir}`));
    process.exit(1);
  }

  const meta = readJsonSafe<any>(resolve(changeDir, 'meta.json'), { slug, title: slug });
  const tasksContent = readFileSafe(resolve(changeDir, 'tasks.md'), 'No tasks.md found.');

  printBanner(`Apply Feature: ${meta.title || slug}`, 'Implementation plan and codebase guidelines');

  console.log(`${c('bold', 'Current Checklist (changes/' + slug + '/tasks.md):')}\n`);
  console.log(tasksContent);

  console.log(`\n${c('cyan', '─'.repeat(60))}`);
  console.log(`${c('bold', c('brightYellow', '⚠️ Codebase Invariants & Best Practices:'))}`);
  console.log(`  1. Keep changes scoped to what is defined in ${c('underline', `changes/${slug}/design.md`)}.`);
  console.log(`  2. If database schema changes are needed, follow repo migration rules.`);
  console.log(`  3. Run fast test verification frequently during development.`);
  console.log(`${c('cyan', '─'.repeat(60))}\n`);

  console.log(`When ready to verify, run:`);
  console.log(`  ${c('cyan', `$ npx playspec verify ${slug} --fast`)}`);
  console.log(`  ${c('cyan', `$ npx playspec verify ${slug}`)} (with full visual reports)\n`);
}
