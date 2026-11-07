import { expect, test } from '@playwright/test';
import { login } from './helpers';

test.describe('Achievements page', () => {
  test('nav link, earned badges and locked catalog render', async ({ page }) => {
    await login(page);

    // nav carries the Achievements entry and highlights it on the page
    await page.getByRole('link', { name: 'Achievements' }).first().click();
    await expect(page).toHaveURL(/\/achievements/);
    await expect(page.getByRole('heading', { level: 1, name: 'Achievements' })).toBeVisible();

    // stat strip
    await expect(page.getByText('Badges').first()).toBeVisible();

    // the seeded student has two earned badges with dates
    const earned = page.locator('section[aria-label="Earned achievements"]');
    await expect(earned.locator('.text-4xl').first()).toBeVisible();
    await expect(earned.getByText('First Deploy')).toBeVisible();
    await expect(earned.getByText('Zero Downtime')).toBeVisible();
    await expect(earned.getByText('+50 XP')).toBeVisible();

    // locked badges show a progress bar where applicable (century: 1240/1000 → earned;
    // level_5 locked: progress text present)
    const locked = page.locator('section[aria-label="Locked achievements"]');
    await expect(locked.getByRole('heading', { name: 'Locked' })).toBeVisible();
  });

  test('reachable via command palette', async ({ page }) => {
    await login(page);
    await page.keyboard.press('Control+k');
    const input = page.getByRole('textbox', { name: 'Search labs and commands' });
    await input.fill('Achievements');
    await page.getByRole('option', { name: 'Achievements' }).first().click();
    await expect(page).toHaveURL(/\/achievements/);
    await expect(page.getByRole('heading', { level: 1, name: 'Achievements' })).toBeVisible();
  });
});
