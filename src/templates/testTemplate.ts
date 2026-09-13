import { toPascalCase } from '../utils/fsUtils.ts';

export function generateTestCode(slug: string, title: string): string {
  const pascalName = toPascalCase(slug);

  return `import { shouldSkipScreenshots } from '../lib/env';
import {
  ${pascalName}Page,
  expect,
  test,
} from '../fixtures/${slug}';

test.describe('${title}', () => {
  test.describe.configure({ mode: 'serial' });

  test.afterEach(async ({ backendApi, createdResourceIds }) => {
    if (process.env.E2E_SKIP_CLEANUP === 'true') {
      console.log(\`ℹ️ Skipping cleanup (E2E_SKIP_CLEANUP=true) for \${createdResourceIds.value.length} items\`);
      return;
    }
    for (const id of createdResourceIds.value) {
      await backendApi.deleteSigning(id).catch((err) => {
        console.warn(\`Unable to cleanup resource \${id}:\`, err);
      });
    }
  });

  test('executes core journey successfully', async ({
    page,
    fixture,
    perfTracker,
    createdResourceIds,
  }) => {
    test.setTimeout(120_000);
    test.info().annotations.push({ type: 'correlationId', description: fixture.correlationId });

    const featurePage = new ${pascalName}Page(page);

    const captureScreenshot = async (name: string, description?: string) => {
      if (shouldSkipScreenshots()) return Buffer.alloc(0);
      const body = await page.screenshot({ fullPage: true });
      await test.info().attach(name, { body, contentType: 'image/png' });
      perfTracker.recordScreenshot(name, body, { description });
      return body;
    };

    // Phase 1: Navigation
    perfTracker.startPhase('1. Navigate to Feature Entry');
    await featurePage.goto();
    await featurePage.waitForReady();
    await captureScreenshot('01-entry-view', 'Initial view of the feature page');
    perfTracker.endPhase('1. Navigate to Feature Entry');

    // Phase 2: Form Interaction & Action
    perfTracker.startPhase('2. Fill and Submit Feature Form');
    await featurePage.fillInputs({ title: fixture.sampleTitle });
    await captureScreenshot('02-form-filled', 'Form populated with test data');
    await featurePage.submit();
    perfTracker.endPhase('2. Fill and Submit Feature Form');

    // Phase 3: Assertion of Success State
    perfTracker.startPhase('3. Assert Result State');
    await featurePage.assertSuccessState();
    await captureScreenshot('03-success-state', 'Success state and feedback rendered');
    perfTracker.endPhase('3. Assert Result State');
  });
});
`;
}
