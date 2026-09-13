import { PlaySpecConfig } from '../config.ts';
import { readJsonSafe, writeJsonSafe } from '../utils/fsUtils.ts';

export interface CommandDefinition {
  id: string;
  title: string;
  command: string;
  description: string;
  instructions: string;
  group: string;
  cwd: string;
  env_vars: string;
  target: string;
  created_at: string;
  last_run_at: string | null;
  last_exit_code: number | null;
  last_duration_seconds: number | null;
}

export interface CommandsConfigFile {
  version: string;
  groups: Array<{ name: string; icon: string; description: string }>;
  commands: CommandDefinition[];
}

export function registerCommandLauncherCard(
  slug: string,
  title: string,
  config: PlaySpecConfig,
  customGroup?: string
): { standardAdded: boolean; fastAdded: boolean } {
  const filePath = config.tui?.commandsJsonPath;
  if (!filePath) {
    return { standardAdded: false, fastAdded: false };
  }

  const fileData = readJsonSafe<CommandsConfigFile | null>(filePath, null);
  if (!fileData || !Array.isArray(fileData.commands)) {
    return { standardAdded: false, fastAdded: false };
  }

  const group = customGroup || config.tui?.defaultGroup || 'E2E';
  const standardId = `e2e_${slug.replace(/-/g, '_')}`;
  const fastId = `e2e_${slug.replace(/-/g, '_')}_fast`;

  let standardAdded = false;
  let fastAdded = false;

  const now = new Date().toISOString();
  const cwdRelative = config.e2e.cwd.replace(process.cwd() + '/', '') || '.';

  if (!fileData.commands.some((c) => c.id === standardId)) {
    fileData.commands.unshift({
      id: standardId,
      title: `⚡ E2E: ${title}`,
      command: `npm run test:e2e:${slug}`,
      description: `Runs the ${title} E2E test suite with visual journey reports`,
      instructions: `E2E Playwright test for ${title}.\n• Executes complete user journey\n• Captures screenshots and performance telemetry\n• Cleans up test appointments automatically`,
      group,
      cwd: cwdRelative,
      env_vars: '',
      target: 'iterm',
      created_at: now,
      last_run_at: null,
      last_exit_code: null,
      last_duration_seconds: null,
    });
    standardAdded = true;
  }

  if (!fileData.commands.some((c) => c.id === fastId)) {
    fileData.commands.unshift({
      id: fastId,
      title: `⚡ E2E: ${title} (Fast Mode)`,
      command: `npm run test:e2e:${slug}:fast`,
      description: `Runs the ${title} E2E test suite in headless fast mode without screenshots`,
      instructions: `Headless fast execution of ${title} E2E test suite with E2E_FAST=true.`,
      group,
      cwd: cwdRelative,
      env_vars: '',
      target: 'iterm',
      created_at: now,
      last_run_at: null,
      last_exit_code: null,
      last_duration_seconds: null,
    });
    fastAdded = true;
  }

  if (standardAdded || fastAdded) {
    writeJsonSafe(filePath, fileData, 2);
  }

  return { standardAdded, fastAdded };
}
