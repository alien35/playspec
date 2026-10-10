import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadConfig } from '../config.ts';
import { ensureDir, writeFileSafe, writeJsonSafe } from '../utils/fsUtils.ts';
import { c, printBanner, badge } from '../utils/formatting.ts';
import { generateVirtualCursorCode } from '../templates/virtualCursorTemplate.ts';

export function runInit(targetDir = process.cwd()): void {
  printBanner('PlaySpec Init', 'Setting up Playwright-First Spec-Driven Development');

  const root = resolve(targetDir);
  const config = loadConfig(root);

  console.log(`${c('cyan', '1.')} Initializing directories...`);
  ensureDir(config.specsDir);
  ensureDir(config.livingSpecsDir);
  ensureDir(config.changesDir);
  ensureDir(config.archiveDir);
  ensureDir(config.e2e.dir);
  ensureDir(config.e2e.testsDir);
  ensureDir(config.e2e.pagesDir);
  ensureDir(config.e2e.fixturesDir);
  const helpersDir = resolve(config.e2e.dir, "helpers");
  ensureDir(helpersDir);

  console.log(`   ${badge('green', 'ready')} ${config.specsDir}`);
  console.log(`   ${badge('green', 'ready')} ${config.changesDir}`);
  console.log(`   ${badge('green', 'ready')} ${config.e2e.dir}`);

  // Scaffold virtual cursor helper
  const virtualCursorPath = resolve(helpersDir, "virtualCursor.ts");
  if (!existsSync(virtualCursorPath)) {
    writeFileSafe(virtualCursorPath, generateVirtualCursorCode());
    console.log(`   ${badge('green', 'created')} ${virtualCursorPath.replace(root + "/", "")}`);
  }

  // Create default playspec.config.json if not present
  const configFilePath = resolve(root, 'playspec.config.json');
  if (!existsSync(configFilePath)) {
    const defaultConfig = {
      $schema: 'https://raw.githubusercontent.com/alien35/playspec/main/schema.json',
      specsDir: 'specs',
      changesDir: 'changes',
      e2e: {
        dir: config.e2e.dir.replace(root + '/', ''),
        cwd: config.e2e.cwd.replace(root + '/', '') || '.',
        testsDir: 'tests',
        pagesDir: 'pages',
        fixturesDir: 'fixtures',
        configPath: config.e2e.configPath,
      },
      ...(config.tui?.commandsJsonPath
        ? {
            tui: {
              commandsJsonPath: config.tui.commandsJsonPath.replace(root + '/', ''),
              defaultGroup: config.tui.defaultGroup,
            },
          }
        : {}),
    };
    writeJsonSafe(configFilePath, defaultConfig, 2);
    console.log(`\n${c('cyan', '2.')} Generated config file:`);
    console.log(`   ${badge('green', 'created')} playspec.config.json`);
  } else {
    console.log(`\n${c('cyan', '2.')} Config file:`);
    console.log(`   ${badge('yellow', 'exists')}  playspec.config.json`);
  }

  // Create starter README in specs/ if missing
  const specsReadme = resolve(config.specsDir, 'README.md');
  if (!existsSync(specsReadme)) {
    writeFileSafe(
      specsReadme,
      `# Living Specifications\n\nAccumulated, verified specifications for this repository. Every specification here is backed by an automated Playwright E2E test suite in \`${config.e2e.dir.replace(root + '/', '')}\`.\n`
    );
  }

  // Create starter README in changes/ if missing
  const changesReadme = resolve(config.changesDir, 'README.md');
  if (!existsSync(changesReadme)) {
    writeFileSafe(
      changesReadme,
      `# In-Flight Changes\n\nFeature proposals and in-progress changes managed by PlaySpec.\n`
    );
  }

  console.log(`\n${c('bold', c('brightGreen', '✨ PlaySpec successfully initialized!'))}`);
  console.log(`\nNext steps:`);
  console.log(`  ${c('cyan', '1.')} Propose your first feature: ${c('bold', 'npx playspec propose my-feature')}`);
  console.log(`  ${c('cyan', '2.')} Run Red Phase test:         ${c('bold', 'npx playspec red my-feature')}`);
  console.log(`  ${c('cyan', '3.')} Verify passing test:        ${c('bold', 'npx playspec verify my-feature --fast')}\n`);
}
