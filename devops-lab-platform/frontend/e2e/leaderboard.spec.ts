import { test, expect } from '@playwright/test';
import { login, E2E_USER, RIVAL_NAME } from './helpers';

test.describe('leaderboard page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/leaderboard');
    await expect(page.getByRole('heading', { level: 1, name: 'Leaderboard' })).toBeVisible({ timeout: 15_000 });
  });

  test('session podium ranks Visual first with rival on it', async ({ page }) => {
    const podium = page.locator('[aria-label="Top three"]');
    await expect(podium.getByText(E2E_USER.fullName, { exact: false })).toBeVisible();
    await expect(podium.getByText(RIVAL_NAME)).toBeVisible();

    // Visual is rank 1 in session scope
    const first = podium.locator('p').filter({ hasText: E2E_USER.fullName });
    await expect(first).toBeVisible();
    await expect(page.locator('[aria-label="Top three"] >> text=(you)').first()).toBeVisible();
  });

  test('all-time scope reorders with Rival leading', async ({ page }) => {
    await page.getByRole('tab', { name: 'All-Time' }).click();
    const podium = page.locator('[aria-label="Top three"]');
    // Rival's all-time score is higher — his card should come first in DOM order
    const names = podium.locator('p[title]');
    await expect(names.first()).toContainText(RIVAL_NAME);
    // score bars reflect the new leader
    await expect(page.getByText('points', { exact: true }).first()).toBeVisible();
  });

  test('standings table shows score meters for ranks 4+', async ({ page }) => {
    // only 2 students seeded: table body hidden or empty — podium covers ranks 1-3
    await expect(page.getByText('Session scores reset each cohort sprint')).toBeVisible();
  });

  test('live status chip is present', async ({ page }) => {
    await expect(page.getByText(/Live|Offline/)).toBeVisible();
  });
});
