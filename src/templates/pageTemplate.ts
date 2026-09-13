import { toPascalCase } from '../utils/fsUtils.ts';

export function generatePageCode(slug: string): string {
  const pascalName = toPascalCase(slug);

  return `import { expect, Locator, Page } from '@playwright/test';

export class ${pascalName}Page {
  readonly page: Page;
  readonly heading: Locator;
  readonly submitButton: Locator;
  readonly titleInput: Locator;
  readonly successNotice: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1 });
    this.submitButton = page.getByRole('button', { name: /submit|continue|save/i });
    this.titleInput = page.getByPlaceholder(/title|name/i).or(page.getByLabel(/title|name/i));
    this.successNotice = page.getByText(/success|completed|created/i);
  }

  async goto() {
    await this.page.goto('/dashboard');
  }

  async waitForReady() {
    await this.page.waitForLoadState('domcontentloaded');
  }

  async fillInputs(data: { title: string }) {
    if (await this.titleInput.count() > 0) {
      await this.titleInput.first().fill(data.title);
    }
  }

  async submit() {
    await this.submitButton.first().click();
  }

  async assertSuccessState() {
    await expect(this.successNotice.first()).toBeVisible({ timeout: 15_000 });
  }
}
`;
}
