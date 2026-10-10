import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { runInit } from '../src/commands/init.ts';
import { runPropose } from '../src/commands/propose.ts';
import { runDiagram } from '../src/commands/diagram.ts';
import { runArchive } from '../src/commands/archive.ts';
import { saveExecutionTrace } from '../src/collector/traceArtifact.ts';
import { loadConfig } from '../src/config.ts';

describe('End-to-End PlaySpec Sequence Diagram Lifecycle', () => {
  let tempDir: string;
  let originalCwd: string;

  before(() => {
    originalCwd = process.cwd();
    tempDir = mkdtempSync(resolve(tmpdir(), 'playspec-e2e-'));
    process.chdir(tempDir);
  });

  after(() => {
    process.chdir(originalCwd);
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('runs init -> propose -> trace -> diagram -> archive', () => {
    const slug = 'document-expiry';

    // 1. Initialize project
    runInit(tempDir);
    assert.ok(existsSync(resolve(tempDir, 'playspec.config.json')));
    assert.ok(existsSync(resolve(tempDir, 'e2e', 'helpers', 'virtualCursor.ts')));

    // 2. Propose feature
    runPropose({ slug, title: 'Document Expiry Alerts' });
    const changeDir = resolve(tempDir, 'changes', slug);
    assert.ok(existsSync(resolve(changeDir, 'design.md')));
    assert.ok(existsSync(resolve(changeDir, 'meta.json')));

    const designInitial = readFileSync(resolve(changeDir, 'design.md'), 'utf-8');
    assert.ok(designInitial.includes('## Reality-Verified Sequence Diagram'));
    assert.ok(designInitial.includes('<!-- PLAYSPEC:SEQUENCE_DIAGRAM:START -->'));

    // Check generated fixture
    const config = loadConfig(tempDir);
    const fixturePath = resolve(config.e2e.fixturesDir, `${slug}.ts`);
    assert.ok(existsSync(fixturePath));
    const fixtureContent = readFileSync(fixturePath, 'utf-8');
    assert.ok(fixtureContent.includes('-TRACE]'));
    assert.ok(fixtureContent.includes('installVirtualCursor'));
    assert.ok(fixtureContent.includes('recordVideo'));
    assert.ok(fixtureContent.includes('/api/'));

    // 3. Simulate runtime execution trace
    saveExecutionTrace(
      {
        slug,
        runId: 'e2e-run-99',
        timestamp: new Date().toISOString(),
        success: true,
        phases: [
          { name: '1. Fill and Submit Document', startedAt: 1000, endedAt: 2000 },
        ],
        userActions: [
          { action: 'Submit Form', description: 'User clicks Save', timestamp: 1050 },
        ],
        causalEvents: [
          {
            subsystem: 'OUTBOX',
            stepSequence: ['1', '2'],
            status: undefined,
            description: 'Enqueue mutation',
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
            id: 'net-1',
            type: 'request',
            method: 'POST',
            url: 'http://localhost/api/v1/documents/doc-901',
            path: '/api/v1/documents/doc-901',
            timestamp: 1150,
          },
          {
            id: 'net-1',
            type: 'response',
            method: 'POST',
            url: 'http://localhost/api/v1/documents/doc-901',
            path: '/api/v1/documents/doc-901',
            status: 200,
            statusText: 'OK',
            timestamp: 1250,
          },
        ],
      },
      tempDir
    );

    // 4. Compile diagram
    runDiagram({ slug });

    // Assert design.md was updated
    const designUpdated = readFileSync(resolve(changeDir, 'design.md'), 'utf-8');
    assert.ok(designUpdated.includes('sequenceDiagram'));
    assert.ok(designUpdated.includes('Outbox Queue') || designUpdated.includes('Outbox'));
    assert.ok(designUpdated.includes('POST /api/v1/documents/doc-901'));
    assert.ok(designUpdated.includes('[OUTBOX-TRACE] Complete [OK]'));

    // 5. Simulate execution video artifact
    writeFileSync(resolve(changeDir, 'recording.webm'), 'mock-video-bytes');

    // 6. Archive feature to living specs
    runArchive(slug);

    const livingSpecPath = resolve(config.livingSpecsDir, `${slug}.md`);
    assert.ok(existsSync(livingSpecPath));
    const livingSpecContent = readFileSync(livingSpecPath, 'utf-8');
    assert.ok(livingSpecContent.includes('## Reality-Verified Sequence Diagram'));
    assert.ok(livingSpecContent.includes('sequenceDiagram'));
    assert.ok(livingSpecContent.includes('POST /api/v1/documents/doc-901'));
    assert.ok(existsSync(resolve(config.livingSpecsDir, 'assets', `${slug}.webm`)));
    assert.ok(livingSpecContent.includes('## Reality-Verified Video Recording'));
    assert.ok(livingSpecContent.includes('![Feature Demo](./assets/document-expiry.webm)'));
  });
});
