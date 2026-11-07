import { test, expect } from '@playwright/test';
import { login, E2E_USER, RIVAL_NAME } from './helpers';

test.describe('dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('stats, continue strip with exam countdown, tracks, heatmap, leaderboard', async ({ page }) => {
    // stat cards
    await expect(page.getByText('XP · Level')).toBeVisible();
    await expect(page.getByText('Day Streak')).toBeVisible();
    await expect(page.getByText('Labs Completed')).toBeVisible();
    await expect(page.getByText('Total Points')).toBeVisible();

    // continue strip: active exam attempt shows a live countdown chip; the
    // failed lab holds a running session so it surfaces as "Session running"
    await expect(page.getByText('Exam in progress')).toBeVisible();
    await expect(page.getByText(/⏱\s*\d{1,2}:\d{2}:\d{2}/)).toBeVisible();
    await expect(page.getByText('Session running').first()).toBeVisible();
    await expect(page.getByText('Next up in your path')).toBeVisible();

    // CKA week stepper: 8 week buttons
    await expect(page.getByRole('heading', { name: 'CKA — Certified Kubernetes Administrator' })).toBeVisible();
    const weekButtons = page.locator('ol[aria-label="Weeks"] button');
    await expect(weekButtons).toHaveCount(8);

    // linux path module grid exists
    await expect(page.getByText('Linux Fundamentals Path')).toBeVisible();

    // heatmap + leaderboard widget
    await expect(page.locator('[role="img"][aria-label*="Labs completed per day"]')).toBeVisible();
    await expect(page.getByText(RIVAL_NAME).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'View full leaderboard →' })).toBeVisible();
  });

  test('module grid deep-links into a lab page', async ({ page }) => {
    const nextLink = page.locator('button', { hasText: /^Next: / }).first();
    await nextLink.click();
    await expect(page).toHaveURL(/\/labs\/[a-z0-9-]+$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('active nav link is marked with aria-current', async ({ page }) => {
    await expect(page.locator('nav[aria-label="App"] a[aria-current="page"]')).toHaveText('Dashboard');
  });

  test('skip link appears on keyboard focus and targets #main', async ({ page }) => {
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  });

  test('logout returns to login page', async ({ page }) => {
    await page.getByRole('banner').getByRole('button', { name: 'Log out' }).click();
    await page.waitForURL('**/login');
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('session survives reload (token persisted)', async ({ page }) => {
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toContainText(E2E_USER.firstName, { timeout: 15_000 });
  });
});
