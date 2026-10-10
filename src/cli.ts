#!/usr/bin/env node
import { runInit } from './commands/init.ts';
import { runExplore } from './commands/explore.ts';
import { runPropose } from './commands/propose.ts';
import { runRedPhase } from './commands/red.ts';
import { runApply } from './commands/apply.ts';
import { runVerify } from './commands/verify.ts';
import { runArchive } from './commands/archive.ts';
import { runDiagram } from './commands/diagram.ts';
import { runList } from './commands/list.ts';
import { c, printBanner } from './utils/formatting.ts';

function printHelp(): void {
  printBanner('PlaySpec CLI', 'Lightweight Playwright-First Spec-Driven Development');

  console.log(`${c('bold', 'USAGE:')}`);
  console.log(`  npx playspec <command> [arguments] [options]\n`);

  console.log(`${c('bold', 'COMMANDS:')}`);
  console.log(`  ${c('cyan', 'init')}                           Initialize PlaySpec in the current directory`);
  console.log(`  ${c('cyan', 'explore')} [query]                 Inspect existing specs, tests, and feature scope`);
  console.log(`  ${c('cyan', 'propose')} <slug> [options]         Scaffold a new feature proposal and Playwright test suite`);
  console.log(`  ${c('cyan', 'red')} <slug>                     Run the scaffolded test in fast mode to assert expected failure`);
  console.log(`  ${c('cyan', 'apply')} <slug>                   View tasks, design context, and repo guidelines for building`);
  console.log(`  ${c('cyan', 'verify')} <slug> [options]        Run Playwright test and assert passing (fast or report mode)`);
  console.log(`  ${c('cyan', 'diagram')} <slug> [options]       Compile runtime traces into a reality-verified Mermaid diagram`);
  console.log(`  ${c('cyan', 'archive')} <slug>                 Promote spec to living docs, update README, and archive change`);
  console.log(`  ${c('cyan', 'list')}                           Display in-flight feature changes and active statuses`);
  console.log(`  ${c('cyan', 'help')}                           Display this help menu\n`);

  console.log(`${c('bold', 'OPTIONS:')}`);
  console.log(`  --title <title>              Custom feature title (used with propose)`);
  console.log(`  --group <group>              Command Launcher TUI group (e.g. RON, Workspace, Misc)`);
  console.log(`  --fast                       Run in fast headless mode skipping screenshots (used with verify)`);
  console.log(`  --headed                     Run with visible browser window (used with verify)`);
  console.log(`  --video                      Record high-definition test execution video with virtual cursor`);
  console.log(`  --slow-mo <ms>               Slow motion delay between actions in ms (e.g. 150)`);
  console.log(`  --json                       Output correlated trace graph as JSON (used with diagram)\n`);

  console.log(`${c('bold', 'EXAMPLES:')}`);
  console.log(`  npx playspec init`);
  console.log(`  npx playspec explore "appointment"`);
  console.log(`  npx playspec propose document-expiry --title "Document Expiry Alerts"`);
  console.log(`  npx playspec red document-expiry`);
  console.log(`  npx playspec verify document-expiry --fast`);
  console.log(`  npx playspec diagram document-expiry`);
  console.log(`  npx playspec archive document-expiry\n`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  const getFlagValue = (flag: string): string | undefined => {
    const idx = args.indexOf(flag);
    if (idx !== -1 && idx + 1 < args.length) {
      return args[idx + 1];
    }
    return undefined;
  };

  const hasFlag = (flag: string): boolean => args.includes(flag);

  switch (command) {
    case 'init': {
      runInit();
      break;
    }

    case 'explore': {
      const query = args[1]?.startsWith('-') ? undefined : args[1];
      runExplore(query);
      break;
    }

    case 'propose': {
      const slug = args[1];
      if (!slug || slug.startsWith('-')) {
        console.error(c('red', '❌ Error: Please specify a feature slug (e.g. `npx playspec propose my-feature`).'));
        process.exit(1);
      }
      const title = getFlagValue('--title');
      const group = getFlagValue('--group');
      runPropose({ slug, title, group });
      break;
    }

    case 'red': {
      const slug = args[1];
      if (!slug) {
        console.error(c('red', '❌ Error: Please specify a feature slug (e.g. `npx playspec red my-feature`).'));
        process.exit(1);
      }
      await runRedPhase(slug);
      break;
    }

    case 'apply': {
      const slug = args[1];
      if (!slug) {
        console.error(c('red', '❌ Error: Please specify a feature slug (e.g. `npx playspec apply my-feature`).'));
        process.exit(1);
      }
      runApply(slug);
      break;
    }

    case 'verify': {
      const slug = args[1];
      if (!slug) {
        console.error(c('red', '❌ Error: Please specify a feature slug (e.g. `npx playspec verify my-feature`).'));
        process.exit(1);
      }
      const fast = hasFlag('--fast');
      const headed = hasFlag('--headed');
      const video = hasFlag('--video');
      const slowMoVal = getFlagValue('--slow-mo');
      const slowMo = slowMoVal ? parseInt(slowMoVal, 10) : undefined;
      await runVerify({ slug, fast, headed, video, slowMo });
      break;
    }

    case 'diagram': {
      const slug = args[1];
      if (!slug || slug.startsWith('-')) {
        console.error(c('red', '❌ Error: Please specify a feature slug (e.g. `npx playspec diagram my-feature`).'));
        process.exit(1);
      }
      const rawJson = hasFlag('--json');
      runDiagram({ slug, rawJson });
      break;
    }

    case 'archive': {
      const slug = args[1];
      if (!slug) {
        console.error(c('red', '❌ Error: Please specify a feature slug (e.g. `npx playspec archive my-feature`).'));
        process.exit(1);
      }
      runArchive(slug);
      break;
    }

    case 'list': {
      runList();
      break;
    }

    default: {
      console.error(c('red', `❌ Unknown command: ${command}\n`));
      printHelp();
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error(c('red', `Unhandled error: ${err.message}`));
  process.exit(1);
});
