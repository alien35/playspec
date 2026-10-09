import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import {
  injectDiagramIntoMarkdown,
  extractDiagramFromMarkdown,
  DIAGRAM_START_MARKER,
  DIAGRAM_END_MARKER,
} from '../src/generator/diagramInjector.ts';

describe('Diagram Injector & Extractor', () => {
  let tempDir: string;

  before(() => {
    tempDir = mkdtempSync(resolve(tmpdir(), 'playspec-test-'));
  });

  after(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('injects diagram into markdown using markers', () => {
    const filePath = resolve(tempDir, 'design.md');
    const initialContent = `# Technical Design\n\n## Reality-Verified Sequence Diagram\n${DIAGRAM_START_MARKER}\nOld diagram\n${DIAGRAM_END_MARKER}\n\n## Other Section\n`;
    writeFileSync(filePath, initialContent);

    const diagram = '```mermaid\nsequenceDiagram\n  User->>UI: Action\n```';
    const success = injectDiagramIntoMarkdown(filePath, diagram, 'tests/sample.e2e.ts');
    assert.strictEqual(success, true);

    const updated = readFileSync(filePath, 'utf-8');
    assert.ok(updated.includes(DIAGRAM_START_MARKER));
    assert.ok(updated.includes(DIAGRAM_END_MARKER));
    assert.ok(updated.includes('User->>UI: Action'));
    assert.ok(!updated.includes('Old diagram'));

    const extracted = extractDiagramFromMarkdown(filePath);
    assert.ok(extracted);
    assert.ok(extracted.includes('User->>UI: Action'));
  });

  it('inserts diagram before E2E section if markers are not present', () => {
    const filePath = resolve(tempDir, 'design-no-markers.md');
    const initialContent = `# Technical Design\n\n## Architecture Overview\nOverview text\n\n## E2E Test Strategy\nDetails\n`;
    writeFileSync(filePath, initialContent);

    const diagram = '```mermaid\nsequenceDiagram\n  A->>B: Call\n```';
    const success = injectDiagramIntoMarkdown(filePath, diagram);
    assert.strictEqual(success, true);

    const updated = readFileSync(filePath, 'utf-8');
    assert.ok(updated.includes(DIAGRAM_START_MARKER));
    assert.ok(updated.includes('A->>B: Call'));
    assert.ok(updated.indexOf('A->>B: Call') < updated.indexOf('## E2E Test Strategy'));
  });
});
