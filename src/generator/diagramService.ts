import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import type { PlaySpecConfig } from '../config.ts';
import { loadExecutionTrace } from '../collector/traceArtifact.ts';
import { correlateExecutionTrace, type CorrelatedTraceGraph } from '../correlator/eventCorrelator.ts';
import { generateMermaidDiagram } from './mermaidGenerator.ts';
import { injectDiagramIntoMarkdown } from './diagramInjector.ts';
import { parseCausalTrace } from '../parser/causalLogParser.ts';
import type { PlaySpecExecutionTrace } from '../collector/traceArtifact.ts';

export interface DiagramCompilationResult {
  success: boolean;
  diagramMarkdown?: string;
  graph?: CorrelatedTraceGraph;
  updatedDesignDoc?: boolean;
  message?: string;
}

export function compileSequenceDiagram(
  slug: string,
  config: PlaySpecConfig,
  fallbackRawOutput?: string
): DiagramCompilationResult {
  let trace = loadExecutionTrace(slug);

  // If no trace artifact was written to disk, attempt recovery from raw runner stdout
  if (!trace && fallbackRawOutput) {
    trace = recoverTraceFromStdout(slug, fallbackRawOutput);
  }

  if (!trace) {
    return {
      success: false,
      message: `No execution trace found for slug '${slug}'. Run the E2E test suite to record runtime traces.`,
    };
  }

  const graph = correlateExecutionTrace(trace, {
    apiPrefixes: config.diagrams?.apiPrefixes,
    subsystemLabels: config.diagrams?.subsystems,
    maxInteractions: config.diagrams?.maxInteractions,
  });

  const testFile = `${config.e2e.dir.replace(process.cwd() + '/', '')}/tests/${slug}.e2e.ts`;
  const diagramMarkdown = generateMermaidDiagram(graph, {
    includeAutonumber: true,
    wrapInCodeBlock: true,
    testFile,
  });

  const changeDir = resolve(config.changesDir, slug);
  const designPath = resolve(changeDir, 'design.md');
  let updatedDesignDoc = false;

  if (existsSync(designPath)) {
    updatedDesignDoc = injectDiagramIntoMarkdown(designPath, diagramMarkdown, testFile);
  }

  return {
    success: true,
    diagramMarkdown,
    graph,
    updatedDesignDoc,
  };
}

function recoverTraceFromStdout(slug: string, rawOutput: string): PlaySpecExecutionTrace | null {
  const lines = rawOutput.split('\n');
  const causalEvents: any[] = [];
  const networkEvents: any[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.includes('-TRACE]')) {
      const parsed = parseCausalTrace(trimmed);
      if (parsed) {
        causalEvents.push(parsed);
      }
    }
  }

  if (causalEvents.length === 0 && networkEvents.length === 0) {
    return null;
  }

  return {
    slug,
    runId: `recovered-${Date.now()}`,
    timestamp: new Date().toISOString(),
    success: true,
    phases: [],
    causalEvents,
    networkEvents,
    userActions: [],
  };
}
