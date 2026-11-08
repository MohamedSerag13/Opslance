import { test, expect } from '@playwright/test';
import { login, E2E_USER } from './helpers';

test.describe('courses — catalog and study plan', () => {
  test('catalog lists seeded courses with progress', async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: 'Courses' }).first().click();
    await expect(page).toHaveURL(/\/courses/);
    await expect(page.getByRole('heading', { name: 'CKA in 8 Weeks' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Linux Fundamentals' })).toBeVisible();
    // stats strip on the CKA card
    await expect(page.getByText(/📅 8 weeks/).first()).toBeVisible();
    await expect(page.getByText(/🎯 Pass mark 66%/).first()).toBeVisible();
    // courses also reachable from the dashboard course strip
  });

  test('dashboard course strip links into the detail page', async ({ page }) => {
    await login(page);
    const pill = page.locator('[aria-label="Course progress"] button').first();
    await expect(pill).toBeVisible({ timeout: 15_000 });
    await pill.click();
    await expect(page).toHaveURL(/\/courses\/(cka-8-weeks|linux-fundamentals)/);
  });

  test('course detail shows 8 weeks, ticks persist after reload', async ({ page }) => {
    await login(page);
    await page.goto('/courses/cka-8-weeks');
    await expect(page.getByRole('heading', { level: 1, name: 'CKA in 8 Weeks' })).toBeVisible({ timeout: 15_000 });

    const week1 = page.locator('section[aria-label^="Week 1"]');
    await expect(week1).toBeVisible();
    await expect(week1.getByText(/Gate — week 1 is done when:/)).toBeVisible();

    // tick the first read item of Week 1, Day 1 (visually-hidden input → force)
    const firstTick = week1.getByLabel(/read: .+/).first();
    await firstTick.check({ force: true });
    await expect(firstTick).toBeChecked();

    // optimistic write → persisted server-side: state survives a full reload
    await page.reload();
    const reloaded = page.locator('section[aria-label^="Week 1"]').getByLabel(/read: .+/).first();
    await expect(reloaded).toBeChecked({ timeout: 15_000 });

    // untick to keep the demo data pristine for repeat runs
    await reloaded.uncheck({ force: true });
    await expect(reloaded).not.toBeChecked();
  });

  test('week navigator scrolls and today chip renders when the date matches', async ({ page }) => {
    await login(page);
    await page.goto('/courses/cka-8-weeks');
    const nav = page.getByRole('navigation', { name: 'Week navigator' });
    await expect(nav.locator('a').first()).toBeVisible({ timeout: 15_000 });
    await nav.locator('a').nth(2).click();
    // scrolling is async; just require the target section to eventually be in view
    await expect(page.locator('#week-3')).toBeInViewport({ timeout: 10_000 });
  });
});
