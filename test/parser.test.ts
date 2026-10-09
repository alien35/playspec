import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseCausalTrace } from '../src/parser/causalLogParser.ts';

describe('Causal Pipeline Log Parser', () => {
  it('parses successful terminal pipeline trace with metadata', () => {
    const log = '[OUTBOX-TRACE] 1 -> 2 -> 3b -> 4 [OK] | entityId=doc-123 | rev=2';
    const result = parseCausalTrace(log);

    assert.ok(result);
    assert.strictEqual(result.subsystem, 'OUTBOX');
    assert.deepStrictEqual(result.stepSequence, ['1', '2', '3b', '4']);
    assert.strictEqual(result.status, 'OK');
    assert.strictEqual(result.metadata.entityId, 'doc-123');
    assert.strictEqual(result.metadata.rev, '2');
  });

  it('parses failed pipeline trace with explicit reason', () => {
    const log = '[SYNC-TRACE] 1 -> 2a -> 3 [FAIL] reason=unhandled-4xx | retry=false';
    const result = parseCausalTrace(log);

    assert.ok(result);
    assert.strictEqual(result.subsystem, 'SYNC');
    assert.deepStrictEqual(result.stepSequence, ['1', '2a', '3']);
    assert.strictEqual(result.status, 'FAIL');
    assert.strictEqual(result.failureReason, 'unhandled-4xx');
    assert.strictEqual(result.metadata.retry, 'false');
  });

  it('parses step transition with description', () => {
    const log = '[OUTBOX-TRACE] 1 -> 2 (Enqueue Mutation) | entityId=doc-99';
    const result = parseCausalTrace(log);

    assert.ok(result);
    assert.strictEqual(result.subsystem, 'OUTBOX');
    assert.deepStrictEqual(result.stepSequence, ['1', '2']);
    assert.strictEqual(result.description, 'Enqueue Mutation');
    assert.strictEqual(result.metadata.entityId, 'doc-99');
    assert.strictEqual(result.status, undefined);
  });

  it('parses single step terminal ack', () => {
    const log = '[ACK_GUARD-TRACE] 1 [OK] | ackId=ack-44';
    const result = parseCausalTrace(log);

    assert.ok(result);
    assert.strictEqual(result.subsystem, 'ACK_GUARD');
    assert.deepStrictEqual(result.stepSequence, ['1']);
    assert.strictEqual(result.status, 'OK');
    assert.strictEqual(result.metadata.ackId, 'ack-44');
  });

  it('ignores non-causal logs', () => {
    assert.strictEqual(parseCausalTrace('Regular console log: user clicked button'), null);
    assert.strictEqual(parseCausalTrace('[DEBUG] Fetching /api/items'), null);
  });
});
