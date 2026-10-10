import { toPascalCase } from '../utils/fsUtils.ts';

export function generateFixtureCode(slug: string): string {
  const pascalName = toPascalCase(slug);

  return `import { test as base, expect, type BrowserContext, type Page } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DEV_BYPASS_STORAGE_KEY, resolveE2eNotaryUser, type E2eNotaryUser } from '../lib/auth';
import { BackendApi } from '../lib/backendApi';
import { hideDevOverlaysInBrowser } from '../lib/hideDevOverlays';
import { resolveE2eTarget, shouldEnableRemoteE2e, type E2eTarget } from '../lib/env';
import { PerformanceTracker } from '../lib/performanceTracker';
import { installVirtualCursor } from '../helpers/virtualCursor';
import { ${pascalName}Page } from '../pages/${slug}.page';

export type ${pascalName}FixtureData = {
  correlationId: string;
  sampleTitle: string;
};

export interface TraceCollectorFixture {
  startPhase: (name: string) => void;
  endPhase: () => void;
  recordUserAction: (action: string, description?: string) => void;
}

type ${pascalName}Fixtures = {
  e2eTarget: E2eTarget;
  notaryUser: E2eNotaryUser;
  backendApi: BackendApi;
  fixture: ${pascalName}FixtureData;
  perfTracker: PerformanceTracker;
  traceCollector: TraceCollectorFixture;
  createdResourceIds: { value: string[] };
  page: Page;
};

export const test = base.extend<${pascalName}Fixtures>({
  e2eTarget: async ({}, use) => {
    const target = resolveE2eTarget();
    if (!target.isLocal && !shouldEnableRemoteE2e()) {
      test.skip(true, 'Set E2E_ENABLED=true to run this suite against a non-local staging host.');
    }
    await use(target);
  },
  notaryUser: async ({}, use) => {
    await use(resolveE2eNotaryUser());
  },
  backendApi: async ({ e2eTarget, notaryUser }, use) => {
    await use(new BackendApi(e2eTarget.backendBaseUrl, notaryUser));
  },
  fixture: async ({}, use) => {
    const runToken = Date.now().toString(16).slice(-6);
    await use({
      correlationId: \`playwright-\${Date.now()}\`,
      sampleTitle: \`E2E Test Resource \${runToken}\`,
    });
  },
  perfTracker: async ({}, use) => {
    await use(new PerformanceTracker());
  },
  createdResourceIds: async ({}, use) => {
    const tracker = { value: [] as string[] };
    await use(tracker);
  },
  traceCollector: async ({}, use) => {
    // Stub overridden in page fixture scope
    await use({
      startPhase: () => {},
      endPhase: () => {},
      recordUserAction: () => {},
    });
  },
  page: async ({ browser, e2eTarget, notaryUser, perfTracker }, use) => {
    perfTracker.startPhase('1. Service Health & Preflight Checks');
    const appReachable = await fetch(e2eTarget.appBaseUrl).catch(() => null);
    if (!appReachable) {
      test.skip(
        true,
        \`taskbox is not reachable at \${e2eTarget.appBaseUrl}. Start the web app before running this suite.\`,
      );
    }
    perfTracker.endPhase('1. Service Health & Preflight Checks');

    const traceData = {
      slug: '${slug}',
      runId: \`run-\${Date.now()}\`,
      timestamp: new Date().toISOString(),
      success: true,
      phases: [] as Array<{ name: string; startedAt: number; endedAt?: number }>,
      causalEvents: [] as Array<{ text: string; timestamp: number }>,
      networkEvents: [] as Array<{
        id: string;
        type: 'request' | 'response';
        method: string;
        url: string;
        path: string;
        status?: number;
        statusText?: string;
        timestamp: number;
      }>,
      userActions: [] as Array<{ action: string; description?: string; timestamp: number }>,
    };

    // Bridge perfTracker to also populate traceData phases
    const origStartPhase = perfTracker.startPhase.bind(perfTracker);
    const origEndPhase = perfTracker.endPhase.bind(perfTracker);

    perfTracker.startPhase = (name: string) => {
      traceData.phases.push({ name, startedAt: Date.now() });
      return origStartPhase(name);
    };

    perfTracker.endPhase = (name: string) => {
      const lastPhase = traceData.phases[traceData.phases.length - 1];
      if (lastPhase && !lastPhase.endedAt) {
        lastPhase.endedAt = Date.now();
      }
      return origEndPhase(name);
    };

    const context: BrowserContext = await browser.newContext({
      baseURL: e2eTarget.appBaseUrl,
      permissions: ['camera', 'microphone'],
      recordVideo: (process.env.PLAYSPEC_VIDEO === 'true' || process.env.VIDEO === 'true') ? {
        dir: path.resolve(process.cwd(), '.playspec', 'videos', '${slug}'),
        size: { width: 1440, height: 1000 },
      } : undefined,
    });

    await context.addInitScript(hideDevOverlaysInBrowser);
    await context.addInitScript(
      ({ storageKey, user }) => {
        window.localStorage.setItem(storageKey, JSON.stringify(user));
      },
      { storageKey: DEV_BYPASS_STORAGE_KEY, user: notaryUser },
    );

    const testPage = await context.newPage();
    await installVirtualCursor(testPage);

    // 1. Dual-Stream Trace Collector: Network Boundary Interception
    testPage.on('request', (req) => {
      const url = req.url();
      if (url.includes('/api/') || url.includes('/graphql') || url.includes('/trpc/')) {
        try {
          const pathname = new URL(url).pathname;
          traceData.networkEvents.push({
            id: req.headers()['x-request-id'] || pathname,
            type: 'request',
            method: req.method().toUpperCase(),
            url,
            path: pathname,
            timestamp: Date.now(),
          });
        } catch {}
      }
    });

    testPage.on('response', (res) => {
      const url = res.url();
      if (url.includes('/api/') || url.includes('/graphql') || url.includes('/trpc/')) {
        try {
          const pathname = new URL(url).pathname;
          traceData.networkEvents.push({
            id: res.request().headers()['x-request-id'] || pathname,
            type: 'response',
            method: res.request().method().toUpperCase(),
            url,
            path: pathname,
            status: res.status(),
            statusText: res.statusText(),
            timestamp: Date.now(),
          });
        } catch {}
      }
    });

    // 2. Dual-Stream Trace Collector: Causal Pipeline Console Stream
    testPage.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('-TRACE]')) {
        traceData.causalEvents.push({ text, timestamp: Date.now() });
      }
      if (msg.type() === 'error') {
        console.error('[BROWSER CONSOLE ERROR]:', text);
      }
    });

    testPage.on('pageerror', (err) => {
      console.error('[BROWSER PAGE ERROR]:', err);
    });

    try {
      await use(testPage);
    } finally {
      // 3. Persist Execution Trace Artifact on completion
      try {
        const traceTargets = [
          path.resolve(process.cwd(), '.playspec', 'traces', '${slug}.json'),
          path.resolve(process.cwd(), 'changes', '${slug}', '.trace.json'),
        ];
        for (const targetPath of traceTargets) {
          fs.mkdirSync(path.dirname(targetPath), { recursive: true });
          fs.writeFileSync(targetPath, JSON.stringify(traceData, null, 2));
        }
      } catch (err) {
        console.warn('Failed to persist PlaySpec trace artifact:', err);
      }
      await context.close();
    }
  },
});

export { expect, ${pascalName}Page };
`;
}
