#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const cliPath = resolve(__dirname, '../src/cli.ts');

const result = spawnSync(
  process.execPath,
  ['--experimental-strip-types', cliPath, ...process.argv.slice(2)],
  { stdio: 'inherit' }
);

process.exit(result.status ?? 0);
