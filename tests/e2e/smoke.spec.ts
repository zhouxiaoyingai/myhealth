import { expect, test } from '@playwright/test';

for (const path of ['/', '/profile', '/log', '/history', '/settings', '/auth']) {
  test(`loads ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByText('MyHealth')).toBeVisible();
  });
}
