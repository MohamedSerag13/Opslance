import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('command palette', () => {
  test('Ctrl+K opens, fuzzy-searches labs, Enter navigates', async ({ page }) => {
    await login(page);
    await page.keyboard.press('Control+k');
    const dialog = page.getByRole('dialog', { name: 'Command palette' });
    await expect(dialog).toBeVisible();

    const input = page.getByRole('textbox', { name: 'Search labs and commands' });
    await expect(input).toBeFocused();

    await input.fill('filesystem');
    const option = page.getByRole('option').first();
    await expect(option).toContainText('Lost in the Filesystem', { ignoreCase: true });

    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/labs\/[a-z0-9-]+\/run$/);
  });

  test('Escape closes the palette', async ({ page }) => {
    await login(page);
    await page.keyboard.press('Control+k');
    await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeHidden();
  });
});
