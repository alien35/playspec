import { PlaySpecConfig } from '../config.ts';
import { readJsonSafe, writeJsonSafe } from '../utils/fsUtils.ts';

export function registerPackageJsonScripts(slug: string, config: PlaySpecConfig): boolean {
  const filePath = config.e2e.packageJsonPath;
  if (!filePath) return false;

  const pkg = readJsonSafe<any>(filePath, null);
  if (!pkg || !pkg.scripts) return false;

  const scriptKey = `test:e2e:${slug}`;
  const fastScriptKey = `test:e2e:${slug}:fast`;

  let modified = false;
  const configFlag = config.e2e.configPath ? `--config ${config.e2e.configPath}` : '';

  if (!pkg.scripts[scriptKey]) {
    pkg.scripts[scriptKey] = `playwright test ${configFlag} ${slug}.e2e.ts`.replace(/\s+/g, ' ');
    modified = true;
  }

  if (!pkg.scripts[fastScriptKey]) {
    pkg.scripts[fastScriptKey] = `E2E_FAST=true playwright test ${configFlag} ${slug}.e2e.ts`.replace(/\s+/g, ' ');
    modified = true;
  }

  if (modified) {
    writeJsonSafe(filePath, pkg, 2);
  }

  return modified;
}
