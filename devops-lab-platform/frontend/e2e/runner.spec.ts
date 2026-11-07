import { test, expect } from '@playwright/test';
import { login, runningSessionLabId } from './helpers';

test.describe('lab runner entry', () => {
  test('mode picker renders for a lab run page', async ({ page }) => {
    await login(page);
    const labId = await runningSessionLabId(page);
    await page.goto(`/labs/${labId}/run`);
    // the runner page loads its mode picker without creating a session
    await expect(page.getByText(/Practice|Exam/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(new RegExp(`/labs/${labId}/run`));
  });
});
