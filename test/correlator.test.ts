import { describe, it } from 'node:test';
import assert from 'node:assert';
import { filterNetworkEvents } from '../src/correlator/traceFilter.ts';
import { correlateExecutionTrace } from '../src/correlator/eventCorrelator.ts';
import { generateMermaidDiagram } from '../src/generator/mermaidGenerator.ts';
import type { PlaySpecExecutionTrace } from '../src/collector/traceArtifact.ts';

describe('Trace Filter & Summarization', () => {
  it('filters out static assets and noise', () => {
    const rawEvents = [
      { id: '1', type: 'request' as const, method: 'GET', url: 'http://localhost/app.js', path: '/app.js', timestamp: 100 },
      { id: '2', type: 'request' as const, method: 'GET', url: 'http://localhost/styles.css', path: '/styles.css', timestamp: 101 },
      { id: '3', type: 'request' as const, method: 'OPTIONS', url: 'http://localhost/api/docs', path: '/api/docs', timestamp: 102 },
      { id: '4', type: 'request' as const, method: 'POST', url: 'http://localhost/api/v1/docs', path: '/api/v1/docs', timestamp: 103 },
      { id: '5', type: 'response' as const, method: 'POST', url: 'http://localhost/api/v1/docs', path: '/api/v1/docs', status: 200, timestamp: 110 },
    ];

    const filtered = filterNetworkEvents(rawEvents, ['/api/']);
    assert.strictEqual(filtered.length, 2);
    assert.strictEqual(filtered[0].path, '/api/v1/docs');
    assert.strictEqual(filtered[1].path, '/api/v1/docs');
  });
});

describe('Causal Event Correlator & Mermaid Synthesis', () => {
  it('correlates user action, causal pipeline, network boundary, and resolution', () => {
    const trace: PlaySpecExecutionTrace = {
      slug: 'document-expiry',
      runId: 'run-1',
      timestamp: new Date().toISOString(),
      success: true,
      phases: [
        { name: '1. Update Document Expiry', startedAt: 1000, endedAt: 2000 },
      ],
      userActions: [
        { action: 'Click Update Expiry', description: 'Update expiry date', timestamp: 1050 },
      ],
      causalEvents: [
        {
          subsystem: 'OUTBOX',
          stepSequence: ['1', '2'],
          description: 'Enqueue mutation',
          status: undefined,
          metadata: { entityId: 'doc-901' },
          raw: '[OUTBOX-TRACE] 1 -> 2 (Enqueue mutation) | entityId=doc-901',
          timestamp: 1100,
        },
        {
          subsystem: 'OUTBOX',
          stepSequence: ['3', '4'],
          status: 'OK',
          metadata: { entityId: 'doc-901' },
          raw: '[OUTBOX-TRACE] 3 -> 4 [OK] | entityId=doc-901',
          timestamp: 1300,
        },
      ],
      networkEvents: [
        {
          id: 'req-1',
          type: 'request',
          method: 'POST',
          url: 'http://localhost:3000/api/v1/documents/doc-901',
          path: '/api/v1/documents/doc-901',
          timestamp: 1150,
        },
        {
          id: 'req-1',
          type: 'response',
          method: 'POST',
          url: 'http://localhost:3000/api/v1/documents/doc-901',
          path: '/api/v1/documents/doc-901',
          status: 200,
          statusText: 'OK',
          timestamp: 1250,
        },
      ],
    };

    const graph = correlateExecutionTrace(trace, {
      subsystemLabels: { OUTBOX: 'Outbox Queue' },
    });

    assert.strictEqual(graph.slug, 'document-expiry');
    // Check participants
    const participantIds = graph.participants.map((p) => p.id);
    assert.ok(participantIds.includes('User'));
    assert.ok(participantIds.includes('UI'));
    assert.ok(participantIds.includes('Outbox'));
    assert.ok(participantIds.includes('API'));

    // Check interaction count
    assert.ok(graph.interactions.length >= 4);

    // Generate Mermaid Diagram
    const mermaid = generateMermaidDiagram(graph);
    assert.ok(mermaid.includes('sequenceDiagram'));
    assert.ok(mermaid.includes('autonumber'));
    assert.ok(mermaid.includes('actor User as User'));
    assert.ok(mermaid.includes('participant Outbox as Outbox Queue'));
    assert.ok(mermaid.includes('participant API as Backend API'));
    assert.ok(mermaid.includes('POST /api/v1/documents/doc-901'));
    assert.ok(mermaid.includes('HTTP 200'));
    assert.ok(mermaid.includes('[OUTBOX-TRACE] Complete [OK]'));
  });

  it('generates alt block on causal failure or HTTP error', () => {
    const trace: PlaySpecExecutionTrace = {
      slug: 'auth-error',
      runId: 'run-2',
      timestamp: new Date().toISOString(),
      success: false,
      phases: [],
      userActions: [],
      causalEvents: [
        {
          subsystem: 'AUTH',
          stepSequence: ['1', '2'],
          status: 'FAIL',
          failureReason: 'unauthorized',
          metadata: {},
          raw: '[AUTH-TRACE] 1 -> 2 [FAIL] reason=unauthorized',
          timestamp: 1000,
        },
      ],
      networkEvents: [
        {
          id: 'req-2',
          type: 'request',
          method: 'GET',
          url: 'http://localhost/api/v1/secure',
          path: '/api/v1/secure',
          timestamp: 1010,
        },
        {
          id: 'req-2',
          type: 'response',
          method: 'GET',
          url: 'http://localhost/api/v1/secure',
          path: '/api/v1/secure',
          status: 401,
          statusText: 'Unauthorized',
          timestamp: 1020,
        },
      ],
    };

    const graph = correlateExecutionTrace(trace);
    const mermaid = generateMermaidDiagram(graph);

    assert.ok(mermaid.includes('alt Failure Branch'));
    assert.ok(mermaid.includes('HTTP 401 Unauthorized'));
    assert.ok(mermaid.includes('alt HTTP Error Failure'));
  });
});
