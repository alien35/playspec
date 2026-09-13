import { toPascalCase } from '../utils/fsUtils.ts';

export function generateFixtureCode(slug: string): string {
  const pascalName = toPascalCase(slug);

  return `import { test as base, expect, type BrowserContext, type Page } from '@playwright/test';
import { DEV_BYPASS_STORAGE_KEY, resolveE2eNotaryUser, type E2eNotaryUser } from '../lib/auth';
import { BackendApi } from '../lib/backendApi';
import { hideDevOverlaysInBrowser } from '../lib/hideDevOverlays';
import { resolveE2eTarget, shouldEnableRemoteE2e, type E2eTarget } from '../lib/env';
import { PerformanceTracker } from '../lib/performanceTracker';
import { ${pascalName}Page } from '../pages/${slug}.page';

export type ${pascalName}FixtureData = {
  correlationId: string;
  sampleTitle: string;
};

type ${pascalName}Fixtures = {
  e2eTarget: E2eTarget;
  notaryUser: E2eNotaryUser;
  backendApi: BackendApi;
  fixture: ${pascalName}FixtureData;
  perfTracker: PerformanceTracker;
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

    const context: BrowserContext = await browser.newContext({
      baseURL: e2eTarget.appBaseUrl,
      permissions: ['camera', 'microphone'],
    });

    await context.addInitScript(hideDevOverlaysInBrowser);
    await context.addInitScript(
      ({ storageKey, user }) => {
        window.localStorage.setItem(storageKey, JSON.stringify(user));
      },
      { storageKey: DEV_BYPASS_STORAGE_KEY, user: notaryUser },
    );

    const testPage = await context.newPage();

    testPage.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('[BROWSER CONSOLE ERROR]:', msg.text());
      }
    });

    testPage.on('pageerror', (err) => {
      console.error('[BROWSER PAGE ERROR]:', err);
    });

    await use(testPage);
    await context.close();
  },
});

export { expect, ${pascalName}Page };
`;
}
