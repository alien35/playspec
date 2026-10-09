import { existsSync } from 'node:fs';
import { readFileSafe, writeFileSafe } from '../utils/fsUtils.ts';
import { formatSequenceDiagramMarkdown } from './mermaidGenerator.ts';

export const DIAGRAM_START_MARKER = '<!-- PLAYSPEC:SEQUENCE_DIAGRAM:START -->';
export const DIAGRAM_END_MARKER = '<!-- PLAYSPEC:SEQUENCE_DIAGRAM:END -->';

export function injectDiagramIntoMarkdown(
  filePath: string,
  diagramMarkdown: string,
  testFile?: string
): boolean {
  if (!existsSync(filePath)) {
    return false;
  }

  const content = readFileSafe(filePath, '');
  const blockContent = `${DIAGRAM_START_MARKER}\n${formatSequenceDiagramMarkdown(diagramMarkdown, testFile)}\n${DIAGRAM_END_MARKER}`;

  let newContent: string;
  if (content.includes(DIAGRAM_START_MARKER) && content.includes(DIAGRAM_END_MARKER)) {
    const startIdx = content.indexOf(DIAGRAM_START_MARKER);
    const endIdx = content.indexOf(DIAGRAM_END_MARKER) + DIAGRAM_END_MARKER.length;
    newContent = content.slice(0, startIdx) + blockContent + content.slice(endIdx);
  } else {
    // If markers don't exist yet, insert right before "## E2E Test Strategy" or append to end
    const anchor = '## E2E Test Strategy';
    if (content.includes(anchor)) {
      newContent = content.replace(anchor, `${blockContent}\n\n${anchor}`);
    } else {
      newContent = `${content.trimEnd()}\n\n${blockContent}\n`;
    }
  }

  writeFileSafe(filePath, newContent);
  return true;
}

export function extractDiagramFromMarkdown(filePath: string): string | null {
  if (!existsSync(filePath)) {
    return null;
  }
  const content = readFileSafe(filePath, '');
  if (!content.includes(DIAGRAM_START_MARKER) || !content.includes(DIAGRAM_END_MARKER)) {
    // Check if there is any ```mermaid sequenceDiagram block
    const mermaidMatch = content.match(/```mermaid[\s\S]*?sequenceDiagram[\s\S]*?```/);
    return mermaidMatch ? mermaidMatch[0] : null;
  }

  const startIdx = content.indexOf(DIAGRAM_START_MARKER) + DIAGRAM_START_MARKER.length;
  const endIdx = content.indexOf(DIAGRAM_END_MARKER);
  return content.slice(startIdx, endIdx).trim();
}
