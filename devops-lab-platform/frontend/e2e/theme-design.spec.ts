import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('theme + design system', () => {
  test('theme toggle flips data-theme and persists across reload', async ({ page }) => {
    await login(page);
    const initial = await page.locator('html').getAttribute('data-theme');
    await page.getByRole('button', { name: /Switch to .* theme/ }).click();
    const after = await page.locator('html').getAttribute('data-theme');
    expect(after).not.toBe(initial);

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', after as string);
  });

  test('/design page lists tokens and components', async ({ page }) => {
    // the design-system showcase is now auth-gated (internal reference)
    await login(page);
    await page.goto('/design');
    await expect(page.getByRole('heading', { name: 'Opslance Design System' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Color tokens' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Typography' })).toBeVisible();
    await expect(page.getByText('Display / Space Grotesk')).toBeVisible();
  });
});

test.describe('mobile viewport', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('dashboard renders without horizontal overflow', async ({ page }) => {
    await login(page);
    const mobileNav = page.locator('nav[aria-label="App sections"]');
    await expect(mobileNav).toBeVisible();

    const overflow = await page.evaluate(() =>
      (document.scrollingElement?.scrollWidth ?? 0) - (window.innerWidth || 0));
    expect(overflow).toBeLessThanOrEqual(2);
  });
});
