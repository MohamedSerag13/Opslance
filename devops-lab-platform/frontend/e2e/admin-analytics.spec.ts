import { expect, test } from '@playwright/test';

const ADMIN = { email: 'admin@opslance.local', password: 'Admin@2025!' };

async function adminLogin(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(ADMIN.email);
  await page.getByRole('textbox', { name: 'Password' }).fill(ADMIN.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/admin');
}

test.describe('Admin analytics', () => {
  test('KPI cards, daily chart and tables render for admins', async ({ page }) => {
    await adminLogin(page);

    // header link from the admin overview
    await page.getByRole('link', { name: 'Analytics' }).first().click();
    await expect(page).toHaveURL(/\/admin\/analytics/);
    await expect(page.getByRole('heading', { level: 1, name: 'Analytics' })).toBeVisible();

    // KPI cards
    await expect(page.getByText('Students').first()).toBeVisible();
    await expect(page.getByText('Pass rate').first()).toBeVisible();
    await expect(page.getByText('XP awarded')).toBeVisible();

    // daily activity chart (SVG with bars) + legend
    const chart = page.locator('figure svg[role="img"]');
    await expect(chart).toBeVisible();
    await expect(page.getByText('passed', { exact: true })).toBeVisible();
    await expect(page.locator('figcaption').getByText('new signups')).toBeVisible();

    // most attempted labs table has real rows (seeded submissions exist)
    await expect(page.getByRole('heading', { name: 'Most attempted labs' })).toBeVisible();
    await expect(page.locator('table').first().locator('tbody tr').first()).toBeVisible();

    // recent submissions feed
    await expect(page.getByRole('heading', { name: 'Recent submissions' })).toBeVisible();
  });

  test('window selector refetches with the chosen range', async ({ page }) => {
    await adminLogin(page);
    await page.goto('/admin/analytics');
    await expect(page.getByRole('heading', { level: 1, name: 'Analytics' })).toBeVisible();

    // the wrapping <label> folds option text into the accessible name, so target the select directly
    await page.locator('select').selectOption('7');
    // after the refetch the KPI grid is still rendered (no crash on new data)
    await expect(page.getByText('Students').first()).toBeVisible();
    await expect(page.locator('figure svg[role="img"]')).toBeVisible();
  });

  test('students cannot open admin analytics (redirected to dashboard)', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email address').fill('visual@opslance.local');
    await page.getByRole('textbox', { name: 'Password' }).fill('VisualPass1!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/dashboard');
    await page.goto('/admin/analytics');
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
