import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadConfig } from '../config.ts';
import { toSlug, toPascalCase, writeFileSafe, writeJsonSafe, ensureDir } from '../utils/fsUtils.ts';
import { c, printBanner, badge } from '../utils/formatting.ts';
import { generateProposalMarkdown } from '../templates/proposalTemplate.ts';
import { generateSpecMarkdown } from '../templates/specTemplate.ts';
import { generateDesignMarkdown } from '../templates/designTemplate.ts';
import { generateTasksMarkdown } from '../templates/tasksTemplate.ts';
import { generateTestCode } from '../templates/testTemplate.ts';
import { generatePageCode } from '../templates/pageTemplate.ts';
import { generateFixtureCode } from '../templates/fixtureTemplate.ts';
import { registerPackageJsonScripts } from '../integrations/packageJson.ts';
import { registerCommandLauncherCard } from '../integrations/commandLauncher.ts';

export interface ProposeOptions {
  slug: string;
  title?: string;
  group?: string;
}

export function runPropose(options: ProposeOptions): void {
  const config = loadConfig();
  const rawSlug = options.slug.trim();
  if (!rawSlug) {
    console.error(c('red', '❌ Error: A feature slug is required (e.g. `npx playspec propose document-expiry`).'));
    process.exit(1);
  }

  const slug = toSlug(rawSlug);
  const title = options.title || toPascalCase(slug).replace(/([A-Z])/g, ' $1').trim();
  const group = options.group || config.tui?.defaultGroup || 'E2E';

  const changeDir = resolve(config.changesDir, slug);
  if (existsSync(changeDir)) {
    console.error(c('yellow', `⚠️ Warning: Change folder already exists at: changes/${slug}`));
    console.log(c('dim', 'If you want to re-propose, please archive or remove the existing change first.'));
    process.exit(1);
  }

  printBanner(`Proposing Feature: ${title}`, `Target slug: changes/${slug}`);

  // 1. Create Change Directory & Markdown Artifacts
  console.log(`${c('cyan', '1.')} Creating spec artifacts in ${c('bold', `changes/${slug}/`)}...`);
  ensureDir(changeDir);

  writeFileSafe(resolve(changeDir, 'proposal.md'), generateProposalMarkdown(slug, title));
  console.log(`   ${badge('green', 'created')} proposal.md`);

  writeFileSafe(resolve(changeDir, 'spec.md'), generateSpecMarkdown(slug, title));
  console.log(`   ${badge('green', 'created')} spec.md (executable requirements & scenarios)`);

  writeFileSafe(resolve(changeDir, 'design.md'), generateDesignMarkdown(slug, title));
  console.log(`   ${badge('green', 'created')} design.md (technical architecture & routes)`);

  writeFileSafe(resolve(changeDir, 'tasks.md'), generateTasksMarkdown(slug, title));
  console.log(`   ${badge('green', 'created')} tasks.md (implementation checklist)`);

  const meta = {
    slug,
    title,
    group,
    status: 'red',
    createdAt: new Date().toISOString(),
    files: {
      test: `${config.e2e.dir.replace(process.cwd() + '/', '')}/tests/${slug}.e2e.ts`,
      page: `${config.e2e.dir.replace(process.cwd() + '/', '')}/pages/${slug}.page.ts`,
      fixture: `${config.e2e.dir.replace(process.cwd() + '/', '')}/fixtures/${slug}.ts`,
    },
  };
  writeJsonSafe(resolve(changeDir, 'meta.json'), meta);
  console.log(`   ${badge('green', 'created')} meta.json`);

  // 2. Scaffold Playwright E2E files
  console.log(`\n${c('cyan', '2.')} Scaffolding Playwright E2E suite...`);
  const testPath = resolve(config.e2e.testsDir, `${slug}.e2e.ts`);
  const pagePath = resolve(config.e2e.pagesDir, `${slug}.page.ts`);
  const fixturePath = resolve(config.e2e.fixturesDir, `${slug}.ts`);

  if (!existsSync(testPath)) {
    writeFileSafe(testPath, generateTestCode(slug, title));
    console.log(`   ${badge('green', 'created')} ${meta.files.test}`);
  } else {
    console.log(`   ${badge('yellow', 'exists')}  ${meta.files.test}`);
  }

  if (!existsSync(pagePath)) {
    writeFileSafe(pagePath, generatePageCode(slug));
    console.log(`   ${badge('green', 'created')} ${meta.files.page}`);
  } else {
    console.log(`   ${badge('yellow', 'exists')}  ${meta.files.page}`);
  }

  if (!existsSync(fixturePath)) {
    writeFileSafe(fixturePath, generateFixtureCode(slug));
    console.log(`   ${badge('green', 'created')} ${meta.files.fixture}`);
  } else {
    console.log(`   ${badge('yellow', 'exists')}  ${meta.files.fixture}`);
  }

  // 3. Register Package.json scripts
  console.log(`\n${c('cyan', '3.')} Updating npm scripts in package.json...`);
  const scriptsAdded = registerPackageJsonScripts(slug, config);
  if (scriptsAdded) {
    console.log(`   ${badge('green', 'registered')} test:e2e:${slug}`);
    console.log(`   ${badge('green', 'registered')} test:e2e:${slug}:fast`);
  } else {
    console.log(`   ${badge('gray', 'skipped')}    scripts already exist or not configured`);
  }

  // 4. Register Command Launcher TUI cards (if TUI is configured)
  if (config.tui?.commandsJsonPath) {
    console.log(`\n${c('cyan', '4.')} Registering Command Launcher TUI cards...`);
    const { standardAdded, fastAdded } = registerCommandLauncherCard(slug, title, config, group);
    if (standardAdded || fastAdded) {
      console.log(`   ${badge('green', 'registered')} command-launcher/commands.json [Group: ${group}]`);
    } else {
      console.log(`   ${badge('gray', 'skipped')}    commands already present`);
    }
  }

  console.log(`\n${c('bold', c('brightGreen', '✨ Feature Proposal & Executable Test Scaffolded!'))}`);
  console.log('\nNext Steps (Red Phase):');
  console.log(`  ${c('cyan', '1.')} Review and refine ${c('bold', `changes/${slug}/spec.md`)}`);
  console.log(`  ${c('cyan', '2.')} Run Red Phase test: ${c('bold', `npx playspec red ${slug}`)} (confirm expected failure)`);
  console.log(`  ${c('cyan', '3.')} Implement feature and run: ${c('bold', `npx playspec verify ${slug} --fast`)}\n`);
}
