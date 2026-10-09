import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

export interface DiagramConfig {
  enabled: boolean;
  apiPrefixes: string[];
  subsystems?: Record<string, string>;
  ignorePatterns?: string[];
  maxInteractions?: number;
}

export interface PlaySpecConfig {
  specsDir: string;
  livingSpecsDir: string;
  changesDir: string;
  archiveDir: string;
  e2e: {
    cwd: string;
    dir: string;
    testsDir: string;
    pagesDir: string;
    fixturesDir: string;
    configPath: string;
    readmePath?: string;
    packageJsonPath?: string;
  };
  tui?: {
    commandsJsonPath?: string;
    defaultGroup?: string;
  };
  diagrams: DiagramConfig;
}

export function findProjectRoot(startDir = process.cwd()): string {
  let current = resolve(startDir);
  while (true) {
    if (existsSync(resolve(current, 'playspec.config.json'))) {
      return current;
    }
    if (existsSync(resolve(current, 'package.json')) && !existsSync(resolve(current, 'playspec/src/config.ts'))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return resolve(process.cwd());
}

export function loadConfig(customRootDir?: string): PlaySpecConfig {
  const root = customRootDir || findProjectRoot();
  const configPath = resolve(root, 'playspec.config.json');

  let fileConfig: any = {};
  if (existsSync(configPath)) {
    try {
      fileConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
    } catch {
      fileConfig = {};
    }
  }

  // Detect E2E layout: root ./e2e vs subfolder taskbox/e2e
  const isTaskboxMonorepo = existsSync(resolve(root, 'taskbox/e2e'));
  const defaultE2eCwd = isTaskboxMonorepo ? resolve(root, 'taskbox') : root;
  const defaultE2eDir = isTaskboxMonorepo ? resolve(root, 'taskbox/e2e') : resolve(root, 'e2e');

  const defaultE2eConfig = existsSync(resolve(defaultE2eDir, 'playwright.config.ts'))
    ? (isTaskboxMonorepo ? 'e2e/playwright.config.ts' : 'playwright.config.ts')
    : 'playwright.config.ts';

  const defaultPackageJson = isTaskboxMonorepo
    ? resolve(root, 'taskbox/package.json')
    : resolve(root, 'package.json');

  const defaultCommandsJson = existsSync(resolve(root, 'command-launcher/commands.json'))
    ? resolve(root, 'command-launcher/commands.json')
    : undefined;

  const specsDir = resolve(root, fileConfig.specsDir || 'specs');
  const changesDir = resolve(root, fileConfig.changesDir || 'changes');

  const e2eDir = resolve(root, fileConfig.e2e?.dir || defaultE2eDir);
  const e2eCwd = resolve(root, fileConfig.e2e?.cwd || defaultE2eCwd);

  return {
    specsDir,
    livingSpecsDir: resolve(specsDir, 'features'),
    changesDir,
    archiveDir: resolve(changesDir, 'archive'),
    e2e: {
      cwd: e2eCwd,
      dir: e2eDir,
      testsDir: resolve(e2eDir, fileConfig.e2e?.testsDir || 'tests'),
      pagesDir: resolve(e2eDir, fileConfig.e2e?.pagesDir || 'pages'),
      fixturesDir: resolve(e2eDir, fileConfig.e2e?.fixturesDir || 'fixtures'),
      configPath: fileConfig.e2e?.configPath || defaultE2eConfig,
      readmePath: resolve(e2eDir, fileConfig.e2e?.readmePath || 'README.md'),
      packageJsonPath: resolve(root, fileConfig.e2e?.packageJsonPath || defaultPackageJson),
    },
    tui: {
      commandsJsonPath: fileConfig.tui?.commandsJsonPath
        ? resolve(root, fileConfig.tui.commandsJsonPath)
        : defaultCommandsJson,
      defaultGroup: fileConfig.tui?.defaultGroup || 'E2E',
    },
    diagrams: {
      enabled: fileConfig.diagrams?.enabled ?? true,
      apiPrefixes: fileConfig.diagrams?.apiPrefixes || ['/api/', '/graphql', '/trpc/'],
      subsystems: fileConfig.diagrams?.subsystems || {},
      ignorePatterns: fileConfig.diagrams?.ignorePatterns || [],
      maxInteractions: fileConfig.diagrams?.maxInteractions || 60,
    },
  };
}

export function getStatusFilePath(commandId: string): string {
  const sanitized = commandId.replace(/[^a-zA-Z0-9_\-]/g, '_');
  return `/tmp/cmd_launcher_status_${sanitized}.json`;
}
