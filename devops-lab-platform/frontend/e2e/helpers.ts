import { expect, Page } from '@playwright/test';

export const E2E_USER = {
  email: 'visual@opslance.local',
  password: 'VisualPass1!',
  firstName: 'Visual',
  fullName: 'Visual Tester',
};

export const RIVAL_NAME = 'Rival Runner';

/** Log in through the real UI and wait for the dashboard to render. */
export async function login(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(E2E_USER.email);
  await page.getByRole('textbox', { name: 'Password' }).fill(E2E_USER.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(E2E_USER.firstName, { timeout: 15_000 });
}

/** Resolve the lab id behind the "session running" continue card via the API. */
export async function runningSessionLabId(page: Page): Promise<string> {
  const token = await page.evaluate(() => {
    const raw = localStorage.getItem('auth-storage');
    return raw ? (JSON.parse(raw)?.state?.token ?? null) : null;
  });
  const res = await page.request.get('/api/progress/dashboard', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  const item = data.continue.find((c: { kind: string }) => c.kind === 'session');
  return item.lab_id as string;
}
