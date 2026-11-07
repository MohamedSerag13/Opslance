import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('progress page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/progress');
    await expect(page.getByRole('heading', { level: 1, name: 'Your progress' })).toBeVisible({ timeout: 15_000 });
  });

  test('stat cards compute from real history', async ({ page }) => {
    await expect(page.getByText('Points earned')).toBeVisible();
    await expect(page.getByText('Pass rate')).toBeVisible();
    // 10 attempts, 9 passed -> 90%
    await expect(page.getByText('90%', { exact: true })).toBeVisible();
    await expect(page.getByText('9 of 10 attempts')).toBeVisible();
    await expect(page.getByText('Time in labs')).toBeVisible();
  });

  test('track summaries and heatmap render', async ({ page }) => {
    await expect(page.getByRole('region', { name: 'Learning track progress' })).toBeVisible();
    await expect(page.getByText('Certification')).toBeVisible();
    await expect(page.locator('[role="img"][aria-label*="Labs completed per day"]')).toBeVisible();
  });

  test('history table lists attempts; failed filter narrows to the failed one', async ({ page }) => {
    const table = page.getByRole('table');
    await expect(table).toBeVisible();
    await expect(table.getByText('Lost in the Filesystem')).toBeVisible();

    await page.getByRole('tab', { name: /Failed/ }).click();
    await expect(table.getByRole('row')).toHaveCount(2); // header + 1 failed row
    await expect(table.getByText('Failed', { exact: true })).toBeVisible();

    await page.getByRole('tab', { name: /Passed/ }).click();
    const rows = table.getByRole('row');
    await expect(rows).toHaveCount(10); // header + 9 passed
  });
});
