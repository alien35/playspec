import type {
  CorrelatedTraceGraph,
  ParticipantDefinition,
  InteractionItem,
} from '../correlator/eventCorrelator.ts';

export interface MermaidGeneratorOptions {
  includeAutonumber?: boolean;
  wrapInCodeBlock?: boolean;
  testFile?: string;
}

export function sanitizeMermaidText(text: string): string {
  return text
    .replace(/["#;]/g, '')
    .replace(/[\n\r]+/g, ' ')
    .trim();
}

export function generateMermaidDiagram(
  graph: CorrelatedTraceGraph,
  options: MermaidGeneratorOptions = {}
): string {
  const {
    includeAutonumber = true,
    wrapInCodeBlock = true,
    testFile,
  } = options;

  const lines: string[] = [];

  if (wrapInCodeBlock) {
    lines.push('```mermaid');
  }
  lines.push('sequenceDiagram');

  if (includeAutonumber) {
    lines.push('  autonumber');
  }

  // 1. Declare Participants in order
  for (const p of graph.participants) {
    const escapedLabel = sanitizeMermaidText(p.label);
    if (p.type === 'actor') {
      lines.push(`  actor ${p.id} as ${escapedLabel}`);
    } else {
      lines.push(`  participant ${p.id} as ${escapedLabel}`);
    }
  }

  // Determine span for phase notes (e.g. "User, API" or "User, UI")
  const firstParticipant = graph.participants[0]?.id || 'User';
  const lastParticipant = graph.participants[graph.participants.length - 1]?.id || 'UI';

  // Active lifeline tracking for clean activation/deactivation
  const activeLifelines = new Set<string>();

  const activateLifeline = (id: string) => {
    if (!activeLifelines.has(id)) {
      lines.push(`  activate ${id}`);
      activeLifelines.add(id);
    }
  };

  const deactivateLifeline = (id: string) => {
    if (activeLifelines.has(id)) {
      lines.push(`  deactivate ${id}`);
      activeLifelines.delete(id);
    }
  };

  // 2. Render Interactions
  for (const item of graph.interactions) {
    switch (item.kind) {
      case 'phase': {
        // Deactivate all before phase transition
        for (const active of Array.from(activeLifelines)) {
          deactivateLifeline(active);
        }
        const phaseTitle = sanitizeMermaidText(item.name);
        lines.push(`  Note over ${firstParticipant},${lastParticipant}: 🏁 ${phaseTitle}`);
        break;
      }

      case 'user_action': {
        const msg = sanitizeMermaidText(item.message);
        lines.push(`  ${item.from}->>${item.to}: ${msg}`);
        activateLifeline(item.to);
        break;
      }

      case 'causal_step': {
        const stepText = sanitizeMermaidText(item.stepDisplay);
        lines.push(`  ${item.from}->>${item.to}: ${stepText}`);
        activateLifeline(item.to);
        break;
      }

      case 'network_call': {
        const method = sanitizeMermaidText(item.method);
        const path = sanitizeMermaidText(item.path);
        const status = item.status || 200;
        const statusText = item.statusText ? ` ${sanitizeMermaidText(item.statusText)}` : '';

        lines.push(`  ${item.from}->>${item.to}: ${method} ${path}`);
        activateLifeline(item.to);

        if (item.isError) {
          lines.push(`  alt HTTP Error Failure`);
          lines.push(`    ${item.to}-->>${item.from}: HTTP ${status}${statusText}`);
          deactivateLifeline(item.to);
          lines.push(`  end`);
        } else {
          lines.push(`  ${item.to}-->>${item.from}: HTTP ${status}${statusText}`);
          deactivateLifeline(item.to);
        }
        break;
      }

      case 'causal_resolution': {
        const resMsg = sanitizeMermaidText(item.message);
        if (item.status === 'FAIL') {
          lines.push(`  alt Failure Branch`);
          lines.push(`    ${item.from}-->>${item.to}: ${resMsg}`);
          deactivateLifeline(item.from);
          lines.push(`  end`);
        } else {
          lines.push(`  ${item.from}-->>${item.to}: ${resMsg}`);
          deactivateLifeline(item.from);
        }
        break;
      }
    }
  }

  // Deactivate any remaining active lifelines
  for (const active of Array.from(activeLifelines)) {
    deactivateLifeline(active);
  }

  if (wrapInCodeBlock) {
    lines.push('```');
  }

  return lines.join('\n');
}

export function formatSequenceDiagramMarkdown(
  diagram: string,
  testFile = 'tests/<slug>.e2e.ts'
): string {
  return `### Reality-Verified Sequence Diagram
_Generated from passing test execution: \`${testFile}\`_

${diagram}
`;
}
