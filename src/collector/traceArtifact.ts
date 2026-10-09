import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { readJsonSafe, writeJsonSafe, ensureDir } from '../utils/fsUtils.ts';
import type { CausalPipelineEvent } from '../parser/causalLogParser.ts';

export interface NetworkTraceEvent {
  id: string;
  type: 'request' | 'response';
  method: string;
  url: string;
  path: string;
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  timestamp: number;
}

export interface PhaseTraceEvent {
  name: string;
  startedAt: number;
  endedAt?: number;
}

export interface UserActionEvent {
  action: string;
  target?: string;
  description?: string;
  timestamp: number;
}

export interface PlaySpecExecutionTrace {
  slug: string;
  runId: string;
  timestamp: string;
  success: boolean;
  phases: PhaseTraceEvent[];
  causalEvents: CausalPipelineEvent[];
  networkEvents: NetworkTraceEvent[];
  userActions: UserActionEvent[];
}

export function getTraceFilePath(slug: string, rootDir = process.cwd()): string {
  // Check if changes/<slug> exists; otherwise store in .playspec/traces/<slug>.json
  const changeDir = resolve(rootDir, 'changes', slug);
  if (existsSync(changeDir)) {
    return resolve(changeDir, '.trace.json');
  }
  const defaultTracesDir = resolve(rootDir, '.playspec', 'traces');
  ensureDir(defaultTracesDir);
  return resolve(defaultTracesDir, `${slug}.json`);
}

export function saveExecutionTrace(trace: PlaySpecExecutionTrace, rootDir = process.cwd()): string {
  const filePath = getTraceFilePath(trace.slug, rootDir);
  ensureDir(resolve(filePath, '..'));
  writeJsonSafe(filePath, trace, 2);
  return filePath;
}

export function loadExecutionTrace(slug: string, rootDir = process.cwd()): PlaySpecExecutionTrace | null {
  const filePath = getTraceFilePath(slug, rootDir);
  if (!existsSync(filePath)) {
    // Also check alternate fallback in .playspec/traces/
    const fallbackPath = resolve(rootDir, '.playspec', 'traces', `${slug}.json`);
    if (existsSync(fallbackPath)) {
      return readJsonSafe<PlaySpecExecutionTrace | null>(fallbackPath, null);
    }
    return null;
  }
  return readJsonSafe<PlaySpecExecutionTrace | null>(filePath, null);
}
