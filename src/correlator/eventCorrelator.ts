import type {
  PlaySpecExecutionTrace,
  NetworkTraceEvent,
  PhaseTraceEvent,
  UserActionEvent,
} from '../collector/traceArtifact.ts';
import type { CausalPipelineEvent } from '../parser/causalLogParser.ts';
import { filterNetworkEvents } from './traceFilter.ts';

export interface ParticipantDefinition {
  id: string;
  label: string;
  type: 'actor' | 'participant';
}

export type InteractionItem =
  | {
      kind: 'phase';
      name: string;
      timestamp: number;
    }
  | {
      kind: 'user_action';
      from: string;
      to: string;
      message: string;
      timestamp: number;
    }
  | {
      kind: 'causal_step';
      from: string;
      to: string;
      subsystem: string;
      stepDisplay: string;
      status?: 'OK' | 'FAIL';
      failureReason?: string;
      description?: string;
      metadata: Record<string, string>;
      timestamp: number;
    }
  | {
      kind: 'network_call';
      from: string;
      to: string;
      method: string;
      path: string;
      status?: number;
      statusText?: string;
      isError: boolean;
      timestamp: number;
    }
  | {
      kind: 'causal_resolution';
      from: string;
      to: string;
      subsystem: string;
      status: 'OK' | 'FAIL';
      failureReason?: string;
      message: string;
      timestamp: number;
    };

export interface CorrelatedTraceGraph {
  slug: string;
  participants: ParticipantDefinition[];
  interactions: InteractionItem[];
}

export interface CorrelatorOptions {
  apiPrefixes?: string[];
  subsystemLabels?: Record<string, string>;
  maxInteractions?: number;
}

export function formatSubsystemId(subsystem: string): string {
  // Turn "OUTBOX_QUEUE" or "outbox-queue" into CamelCase identifier "OutboxQueue"
  return subsystem
    .toLowerCase()
    .replace(/[^a-z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/^([a-z])/, (_, chr) => chr.toUpperCase());
}

export function formatSubsystemLabel(subsystem: string, customLabels?: Record<string, string>): string {
  if (customLabels && customLabels[subsystem]) {
    return customLabels[subsystem];
  }
  // Turn "OUTBOX" into "Outbox Subsystem", "AUTH_GUARD" into "Auth Guard"
  const spaced = subsystem
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return `${spaced}`;
}

export function correlateExecutionTrace(
  trace: PlaySpecExecutionTrace,
  options: CorrelatorOptions = {}
): CorrelatedTraceGraph {
  const maxInteractions = options.maxInteractions || 60;
  const filteredNetwork = filterNetworkEvents(trace.networkEvents, options.apiPrefixes);

  // Group network requests and responses by URL/ID
  interface PendingRequest {
    req: NetworkTraceEvent;
    res?: NetworkTraceEvent;
    initiator: string;
  }

  // Identify all participants
  const participantsMap = new Map<string, ParticipantDefinition>();
  participantsMap.set('User', { id: 'User', label: 'User', type: 'actor' });
  participantsMap.set('UI', { id: 'UI', label: 'Application UI', type: 'participant' });

  // Add subsystem participants from causal events
  for (const raw of (trace.causalEvents || []) as any[]) {
    const sub = typeof raw === 'string'
      ? raw.match(/\[([A-Za-z0-9_\-]+)-TRACE\]/)?.[1]
      : raw?.subsystem || (raw?.text ? raw.text.match(/\[([A-Za-z0-9_\-]+)-TRACE\]/)?.[1] : undefined);
    if (sub) {
      const pId = formatSubsystemId(sub);
      if (!participantsMap.has(pId)) {
        participantsMap.set(pId, {
          id: pId,
          label: formatSubsystemLabel(sub, options.subsystemLabels),
          type: 'participant',
        });
      }
    }
  }

  // Add API participant if network calls exist
  if (filteredNetwork.length > 0) {
    participantsMap.set('API', { id: 'API', label: 'Backend API', type: 'participant' });
  }

  // Combine all timeline events chronologically
  type RawTimelineEvent =
    | { kind: 'phase'; data: PhaseTraceEvent; timestamp: number }
    | { kind: 'user'; data: UserActionEvent; timestamp: number }
    | { kind: 'causal'; data: CausalPipelineEvent; timestamp: number }
    | { kind: 'network_req'; data: NetworkTraceEvent; timestamp: number }
    | { kind: 'network_res'; data: NetworkTraceEvent; timestamp: number };

  const timeline: RawTimelineEvent[] = [];

  for (const phase of trace.phases) {
    timeline.push({ kind: 'phase', data: phase, timestamp: phase.startedAt });
  }

  for (const action of trace.userActions) {
    timeline.push({ kind: 'user', data: action, timestamp: action.timestamp });
  }

  for (const raw of (trace.causalEvents || []) as any[]) {
    const cEvent: CausalPipelineEvent | null =
      typeof raw === 'string'
        ? parseCausalTrace(raw)
        : raw && raw.subsystem
        ? raw
        : raw && raw.text
        ? parseCausalTrace(raw.text, raw.timestamp)
        : null;
    if (cEvent) {
      timeline.push({ kind: 'causal', data: cEvent, timestamp: cEvent.timestamp });
    }
  }

  for (const net of filteredNetwork) {
    if (net.type === 'request') {
      timeline.push({ kind: 'network_req', data: net, timestamp: net.timestamp });
    } else {
      timeline.push({ kind: 'network_res', data: net, timestamp: net.timestamp });
    }
  }

  // Sort chronologically
  timeline.sort((a, b) => a.timestamp - b.timestamp);

  const interactions: InteractionItem[] = [];
  let currentActiveSubsystem: string | undefined;

  // Track pending network requests to pair responses
  const openRequests = new Map<string, { req: NetworkTraceEvent; initiator: string }>();

  for (const item of timeline) {
    if (interactions.length >= maxInteractions) {
      break;
    }

    switch (item.kind) {
      case 'phase': {
        interactions.push({
          kind: 'phase',
          name: item.data.name,
          timestamp: item.timestamp,
        });
        break;
      }

      case 'user': {
        interactions.push({
          kind: 'user_action',
          from: 'User',
          to: 'UI',
          message: item.data.description || item.data.action,
          timestamp: item.timestamp,
        });
        break;
      }

      case 'causal': {
        const cEvent = item.data;
        const subId = formatSubsystemId(cEvent.subsystem);
        currentActiveSubsystem = subId;

        // If it's a step transition (e.g. 1 -> 2)
        const stepDisplay = cEvent.stepSequence.join(' -> ');
        const descSuffix = cEvent.description ? ` (${cEvent.description})` : '';

        interactions.push({
          kind: 'causal_step',
          from: 'UI',
          to: subId,
          subsystem: cEvent.subsystem,
          stepDisplay: `[${cEvent.subsystem}-TRACE] ${stepDisplay}${descSuffix}`,
          status: cEvent.status,
          failureReason: cEvent.failureReason,
          description: cEvent.description,
          metadata: cEvent.metadata,
          timestamp: item.timestamp,
        });

        // If it terminated [OK] or [FAIL], emit resolution back to UI
        if (cEvent.status) {
          interactions.push({
            kind: 'causal_resolution',
            from: subId,
            to: 'UI',
            subsystem: cEvent.subsystem,
            status: cEvent.status,
            failureReason: cEvent.failureReason,
            message:
              cEvent.status === 'OK'
                ? `[${cEvent.subsystem}-TRACE] Complete [OK]`
                : `[${cEvent.subsystem}-TRACE] [FAIL] ${cEvent.failureReason || 'Error'}`,
            timestamp: item.timestamp + 1,
          });
          currentActiveSubsystem = undefined;
        }
        break;
      }

      case 'network_req': {
        const req = item.data;
        const initiator = currentActiveSubsystem || 'UI';
        openRequests.set(req.id || req.path, { req, initiator });
        break;
      }

      case 'network_res': {
        const res = item.data;
        const key = res.id || res.path;
        const pending = openRequests.get(key) || {
          req: {
            id: key,
            type: 'request',
            method: res.method || 'GET',
            url: res.url,
            path: res.path,
            timestamp: res.timestamp - 10,
          },
          initiator: currentActiveSubsystem || 'UI',
        };
        openRequests.delete(key);

        const isError = (res.status || 200) >= 400;
        interactions.push({
          kind: 'network_call',
          from: pending.initiator,
          to: 'API',
          method: pending.req.method,
          path: pending.req.path,
          status: res.status,
          statusText: res.statusText,
          isError,
          timestamp: item.timestamp,
        });
        break;
      }
    }
  }

  // Handle any unclosed requests that didn't receive a response
  for (const [, pending] of openRequests) {
    if (interactions.length >= maxInteractions) break;
    interactions.push({
      kind: 'network_call',
      from: pending.initiator,
      to: 'API',
      method: pending.req.method,
      path: pending.req.path,
      isError: false,
      timestamp: pending.req.timestamp,
    });
  }

  return {
    slug: trace.slug,
    participants: Array.from(participantsMap.values()),
    interactions,
  };
}
