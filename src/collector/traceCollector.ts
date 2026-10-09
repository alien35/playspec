import { parseCausalTrace } from '../parser/causalLogParser.ts';
import {
  saveExecutionTrace,
  type PlaySpecExecutionTrace,
  type PhaseTraceEvent,
  type NetworkTraceEvent,
  type UserActionEvent,
} from './traceArtifact.ts';
import type { CausalPipelineEvent } from '../parser/causalLogParser.ts';

export class TraceCollector {
  private slug: string;
  private runId: string;
  private phases: PhaseTraceEvent[] = [];
  private causalEvents: CausalPipelineEvent[] = [];
  private networkEvents: NetworkTraceEvent[] = [];
  private userActions: UserActionEvent[] = [];
  private currentPhase?: PhaseTraceEvent;
  private success = true;

  constructor(slug: string, runId = `run-${Date.now()}`) {
    this.slug = slug;
    this.runId = runId;
  }

  public startPhase(name: string): void {
    if (this.currentPhase && !this.currentPhase.endedAt) {
      this.currentPhase.endedAt = Date.now();
    }
    const phase: PhaseTraceEvent = {
      name,
      startedAt: Date.now(),
    };
    this.phases.push(phase);
    this.currentPhase = phase;
  }

  public endPhase(name?: string): void {
    if (this.currentPhase) {
      this.currentPhase.endedAt = Date.now();
      this.currentPhase = undefined;
    }
  }

  public recordConsole(text: string): void {
    if (text.includes('-TRACE]')) {
      const parsed = parseCausalTrace(text);
      if (parsed) {
        this.causalEvents.push(parsed);
      }
    }
  }

  public recordNetworkRequest(req: {
    id?: string;
    method: string;
    url: string;
    headers?: Record<string, string>;
  }): void {
    const urlObj = safeParseUrl(req.url);
    this.networkEvents.push({
      id: req.id || req.url,
      type: 'request',
      method: req.method.toUpperCase(),
      url: req.url,
      path: urlObj ? urlObj.pathname : req.url,
      headers: req.headers,
      timestamp: Date.now(),
    });
  }

  public recordNetworkResponse(res: {
    id?: string;
    method: string;
    url: string;
    status: number;
    statusText?: string;
  }): void {
    const urlObj = safeParseUrl(res.url);
    this.networkEvents.push({
      id: res.id || res.url,
      type: 'response',
      method: res.method.toUpperCase(),
      url: res.url,
      path: urlObj ? urlObj.pathname : res.url,
      status: res.status,
      statusText: res.statusText,
      timestamp: Date.now(),
    });
  }

  public recordUserAction(action: string, target?: string, description?: string): void {
    this.userActions.push({
      action,
      target,
      description,
      timestamp: Date.now(),
    });
  }

  public setStatus(success: boolean): void {
    this.success = success;
  }

  public finalize(rootDir?: string): PlaySpecExecutionTrace {
    if (this.currentPhase && !this.currentPhase.endedAt) {
      this.currentPhase.endedAt = Date.now();
    }
    const trace: PlaySpecExecutionTrace = {
      slug: this.slug,
      runId: this.runId,
      timestamp: new Date().toISOString(),
      success: this.success,
      phases: this.phases,
      causalEvents: this.causalEvents,
      networkEvents: this.networkEvents,
      userActions: this.userActions,
    };

    saveExecutionTrace(trace, rootDir);
    return trace;
  }
}

function safeParseUrl(urlStr: string): URL | null {
  try {
    return new URL(urlStr);
  } catch {
    return null;
  }
}
