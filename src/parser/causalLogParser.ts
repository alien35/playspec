export interface CausalPipelineEvent {
  subsystem: string;             // e.g. "OUTBOX", "SYNC", "AUTH"
  stepSequence: string[];        // e.g. ["1", "2", "3b", "4"]
  transition?: { from: string; to: string }; // e.g. { from: "1", to: "2" }
  status?: 'OK' | 'FAIL';
  failureReason?: string;        // e.g. "unhandled-4xx"
  description?: string;          // e.g. "Enqueue mutation"
  metadata: Record<string, string>; // e.g. { entityId: "doc-123", rev: "2" }
  raw: string;
  timestamp: number;
}

/**
 * Parses Causal Numbered Pipeline Traces (causal-pipeline-logging).
 * Matches patterns like:
 *   [OUTBOX-TRACE] 1 -> 2 -> 3b -> 4 [OK] | entityId=doc-123 | rev=2
 *   [SYNC-TRACE] 1 -> 2a -> 3 [FAIL] reason=unhandled-4xx | retry=false
 *   [OUTBOX-TRACE] 1 -> 2 (Enqueue) | entityId=doc-123
 *   [AUTH-GUARD-TRACE] 1 [OK] | user=notary-1
 */
export function parseCausalTrace(line: string, timestamp = Date.now()): CausalPipelineEvent | null {
  const trimmed = line.trim();
  if (!trimmed.includes('-TRACE]')) {
    return null;
  }

  // Extract subsystem tag: [OUTBOX-TRACE] or [SYNC_WORKER-TRACE]
  const tagMatch = trimmed.match(/\[([A-Za-z0-9_\-]+)-TRACE\]/);
  if (!tagMatch) {
    return null;
  }

  const subsystem = tagMatch[1];
  const afterTag = trimmed.slice(tagMatch.index! + tagMatch[0].length).trim();

  // Split content and metadata by pipe "|"
  const parts = afterTag.split('|').map((p) => p.trim());
  const coreBody = parts[0] || '';
  const metaParts = parts.slice(1);

  // Parse metadata pairs (key=value)
  const metadata: Record<string, string> = {};
  for (const part of metaParts) {
    const eqIdx = part.indexOf('=');
    if (eqIdx !== -1) {
      const key = part.slice(0, eqIdx).trim();
      const val = part.slice(eqIdx + 1).trim();
      if (key) metadata[key] = val;
    } else if (part) {
      metadata[part] = 'true';
    }
  }

  // Check for status [OK] or [FAIL]
  let status: 'OK' | 'FAIL' | undefined;
  let failureReason: string | undefined;

  let bodyClean = coreBody;
  const okMatch = bodyClean.match(/\[OK\]/i);
  const failMatch = bodyClean.match(/\[FAIL\](?:\s+reason=([^\s|]+))?/i);

  if (failMatch) {
    status = 'FAIL';
    failureReason = failMatch[1] || metadata.reason || undefined;
    bodyClean = bodyClean.replace(/\[FAIL\](?:\s+reason=[^\s|]+)?/i, '').trim();
  } else if (okMatch) {
    status = 'OK';
    bodyClean = bodyClean.replace(/\[OK\]/i, '').trim();
  }

  // Check for description in parentheses: "1 -> 2 (Enqueue Mutation)"
  let description: string | undefined;
  const descMatch = bodyClean.match(/\(([^)]+)\)/);
  if (descMatch) {
    description = descMatch[1].trim();
    bodyClean = bodyClean.replace(/\([^)]+\)/, '').trim();
  }

  // Parse step sequence (e.g. "1 -> 2 -> 3b -> 4" or "1")
  const rawSteps = bodyClean
    .split('->')
    .map((s) => s.trim())
    .filter(Boolean);

  const stepSequence = rawSteps.length > 0 ? rawSteps : ['1'];

  let transition: { from: string; to: string } | undefined;
  if (stepSequence.length === 2) {
    transition = { from: stepSequence[0], to: stepSequence[1] };
  } else if (stepSequence.length > 2) {
    transition = { from: stepSequence[stepSequence.length - 2], to: stepSequence[stepSequence.length - 1] };
  }

  return {
    subsystem,
    stepSequence,
    transition,
    status,
    failureReason,
    description,
    metadata,
    raw: trimmed,
    timestamp,
  };
}
