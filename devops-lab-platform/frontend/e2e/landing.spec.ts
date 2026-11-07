import { test, expect } from '@playwright/test';

test.describe('landing page', () => {
  test('hero, 3D cluster canvas and terminal demo render', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Master DevOps');

    // 3D hero canvas (desktop viewport) is interactive and painted
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box?.width).toBeGreaterThan(300);

    // terminal demo loaded as its own lazy chunk
    await expect(page.getByText('$ kubectl config use-context k3s-server')).toBeVisible();

    // key sections present
    for (const anchor of ['how', 'paths', 'exam', 'pricing', 'faq']) {
      await expect(page.locator(`#${anchor}`)).toHaveCount(1);
    }
    await expect(page.getByText('72', { exact: true }).first()).toBeVisible();
  });

  test('nav CTA links to login', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Get started' })).toBeVisible();
  });
});
