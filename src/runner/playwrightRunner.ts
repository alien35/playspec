import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { loadConfig, getStatusFilePath } from '../config.ts';
import { stripAnsi, c } from '../utils/formatting.ts';
import { existsSync, readdirSync, copyFileSync } from 'node:fs';
import { writeFileSafe, ensureDir } from '../utils/fsUtils.ts';

export interface RunOptions {
  testFile: string;
  slug?: string;
  fast?: boolean;
  commandId?: string;
  title?: string;
  headed?: boolean;
  video?: boolean;
  slowMo?: number;
  grep?: string;
  cwd?: string;
}

export interface RunResult {
  success: boolean;
  exitCode: number;
  durationSeconds: number;
  errorHeadline?: string;
  errorSummary?: string;
  rawOutput: string;
  videoPath?: string;
}

export function extractErrorDetails(rawOutput: string): { headline?: string; summary?: string } {
  const cleaned = stripAnsi(rawOutput);
  const lines = cleaned.split('\n');

  let headline: string | undefined;
  const summaryLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (
      line.startsWith('Error: expect(') ||
      line.startsWith('TimeoutError:') ||
      line.startsWith('AssertionError:') ||
      line.includes('Test timeout of') ||
      line.includes('Target page, context or browser has been closed') ||
      line.startsWith('● ') ||
      line.startsWith('✕ ')
    ) {
      if (!headline) {
        headline = line;
      }
      summaryLines.push(lines[i]);
      for (let j = i + 1; j < Math.min(i + 16, lines.length); j++) {
        if (lines[j].trim().startsWith('at ') || lines[j].trim().startsWith('Received:') || lines[j].trim().startsWith('Expected:')) {
          summaryLines.push(lines[j]);
        }
      }
      break;
    }
  }

  if (!headline) {
    for (const line of lines) {
      if (line.includes('Error:') || line.includes('FAIL')) {
        headline = line.trim();
        break;
      }
    }
  }

  return {
    headline,
    summary: summaryLines.length > 0 ? summaryLines.join('\n') : undefined,
  };
}

export function writeRunnerStatus(
  commandId: string,
  status: 'running' | 'success' | 'error' | 'interrupted',
  title = '',
  exitCode?: number,
  duration = 0,
  errorSummary = ''
): void {
  const filePath = getStatusFilePath(commandId);
  const payload = {
    command_id: commandId,
    title,
    status,
    exit_code: exitCode,
    duration: parseFloat(duration.toFixed(2)),
    error_summary: errorSummary,
    updated_at: new Date().toISOString(),
  };
  try {
    writeFileSafe(filePath, JSON.stringify(payload, null, 2));
  } catch {
    // Non-fatal
  }
}

export async function runPlaywrightTest(options: RunOptions): Promise<RunResult> {
  const config = loadConfig();
  const runCwd = options.cwd || config.e2e.cwd;
  const startTime = Date.now();
  const inferredSlug = options.slug || options.testFile.replace(/\.e2e\.(ts|js)$/, '');
  if (options.video) {
    process.env.VIDEO = 'true';
    process.env.PLAYSPEC_VIDEO = 'true';
    process.env.RECORD_VIDEO = 'true';
    if (!process.env.SLOW_MO) {
      process.env.SLOW_MO = String(options.slowMo || 150);
    }
  } else if (options.slowMo) {
    process.env.SLOW_MO = String(options.slowMo);
  }

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    ...(options.fast ? { E2E_FAST: 'true' } : {}),
    PLAYSPEC_SLUG: inferredSlug,
    PLAYSPEC_PROJECT_ROOT: config.specsDir ? resolve(config.specsDir, '..') : process.cwd(),
  };

  const args = ['playwright', 'test'];
  if (config.e2e.configPath) {
    args.push('--config', config.e2e.configPath);
  }
  args.push(options.testFile);

  if (options.headed) {
    args.push('--headed');
  }
  if (options.grep) {
    args.push('--grep', options.grep);
  }

  if (options.commandId) {
    writeRunnerStatus(options.commandId, 'running', options.title || options.testFile);
  }

  console.log(`${c('cyan', '▶ Executing:')} npx ${args.join(' ')}`);
  console.log(`${c('dim', `  Working Directory: ${runCwd}`)}`);
  if (options.fast) {
    console.log(`${c('dim', '  Mode: Fast (headless, skip screenshots)')}`);
  }
  console.log('');

  let outputBuffer = '';

  return new Promise<RunResult>((resolvePromise) => {
    const child = spawn('npx', args, {
      cwd: runCwd,
      env,
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    child.stdout.on('data', (data: Buffer) => {
      const text = data.toString();
      outputBuffer += text;
      process.stdout.write(text);
    });

    child.stderr.on('data', (data: Buffer) => {
      const text = data.toString();
      outputBuffer += text;
      process.stderr.write(text);
    });

    const cleanupAndResolve = (code: number, signal?: string) => {
      const durationSeconds = (Date.now() - startTime) / 1000;
      const success = code === 0;
      const status = signal ? 'interrupted' : success ? 'success' : 'error';
      const { headline, summary } = extractErrorDetails(outputBuffer);

      if (options.commandId) {
        writeRunnerStatus(
          options.commandId,
          status,
          options.title || options.testFile,
          code,
          durationSeconds,
          headline || ''
        );
      }

      let capturedVideoPath: string | undefined;
      if (options.video || env.PLAYSPEC_VIDEO === 'true' || env.VIDEO === 'true') {
        try {
          const videoSearchDirs = [
            resolve(runCwd, '.playspec', 'videos', inferredSlug),
            resolve(process.cwd(), '.playspec', 'videos', inferredSlug),
            resolve(runCwd, 'test-results'),
            resolve(process.cwd(), 'test-results'),
          ];

          for (const searchDir of videoSearchDirs) {
            if (existsSync(searchDir)) {
              const findWebm = (dir: string): string | null => {
                const entries = readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                  const full = resolve(dir, entry.name);
                  if (entry.isDirectory()) {
                    const found = findWebm(full);
                    if (found) return found;
                  } else if (entry.isFile() && entry.name.endsWith('.webm')) {
                    return full;
                  }
                }
                return null;
              };

              const found = findWebm(searchDir);
              if (found) {
                const targetPlayspecVideoDir = resolve(process.cwd(), '.playspec', 'videos');
                ensureDir(targetPlayspecVideoDir);
                const playspecVideoPath = resolve(targetPlayspecVideoDir, `${inferredSlug}.webm`);
                copyFileSync(found, playspecVideoPath);

                const changeDir = resolve(config.changesDir, inferredSlug);
                if (existsSync(changeDir)) {
                  const changeVideoPath = resolve(changeDir, 'recording.webm');
                  copyFileSync(found, changeVideoPath);
                }

                capturedVideoPath = playspecVideoPath;
                break;
              }
            }
          }
        } catch {}
      }

      resolvePromise({
        success,
        exitCode: code,
        durationSeconds,
        errorHeadline: headline,
        errorSummary: summary,
        rawOutput: outputBuffer,
        videoPath: capturedVideoPath,
      });
    };

    child.on('close', (code) => {
      cleanupAndResolve(code ?? 1);
    });

    child.on('error', (err) => {
      outputBuffer += `\nProcess error: ${err.message}`;
      cleanupAndResolve(1);
    });
  });
}
