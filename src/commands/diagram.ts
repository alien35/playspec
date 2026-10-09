import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadConfig } from '../config.ts';
import { c, printBanner, badge } from '../utils/formatting.ts';
import { compileSequenceDiagram } from '../generator/diagramService.ts';
import { loadExecutionTrace } from '../collector/traceArtifact.ts';

export interface DiagramOptions {
  slug: string;
  update?: boolean;
  rawJson?: boolean;
}

export function runDiagram(options: DiagramOptions): void {
  const { slug, update, rawJson } = options;
  const config = loadConfig();
  const changeDir = resolve(config.changesDir, slug);

  if (!existsSync(changeDir)) {
    console.error(c('red', `❌ Error: Change directory not found: changes/${slug}`));
    process.exit(1);
  }

  printBanner(`Sequence Diagram: ${slug}`, 'Compile runtime traces into reality-verified Mermaid diagram');

  const trace = loadExecutionTrace(slug);
  if (!trace) {
    console.log(c('yellow', `⚠️ No execution trace found for ${slug}.`));
    console.log(c('dim', `Run the verification test first to capture runtime traces:`));
    console.log(`  ${c('cyan', `$ npx playspec verify ${slug} --fast`)}\n`);
    return;
  }

  const result = compileSequenceDiagram(slug, config);

  if (!result.success || !result.diagramMarkdown) {
    console.error(c('red', `❌ Failed to compile diagram: ${result.message || 'Unknown error'}`));
    process.exit(1);
  }

  if (rawJson && result.graph) {
    console.log(JSON.stringify(result.graph, null, 2));
    return;
  }

  console.log(`${badge('green', 'compiled')} Mermaid Sequence Diagram:\n`);
  console.log(c('cyan', '─'.repeat(60)));
  console.log(result.diagramMarkdown);
  console.log(c('cyan', '─'.repeat(60)));

  if (result.updatedDesignDoc) {
    console.log(`\n${badge('green', 'updated')} ${c('bold', `changes/${slug}/design.md`)}`);
  } else {
    console.log(`\n${badge('gray', 'note')} Run with ${c('bold', 'verify')} to automatically persist to design.md.`);
  }
  console.log('');
}
