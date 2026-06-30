import { expect, test } from '@playwright/test';
import { generateAdvice, sampleProfile } from '../../src/domain/advice';
import { today } from '../../src/lib/date';

for (const path of ['/', '/profile', '/log', '/history', '/settings', '/auth']) {
  test(`loads ${path}`, async ({ page }) => {
    if (path === '/') {
      const date = today();
      const advice = {
        ...generateAdvice(sampleProfile, date),
        images: {
          source: 'doubao',
          dietUrl: 'https://tos-cn-beijing.volces.com/e2e-diet.png',
          exerciseUrl: 'https://tos-cn-beijing.volces.com/e2e-exercise.png',
        },
      };

      await page.addInitScript(
        ({ profile, advice }) => {
          window.localStorage.setItem(
            'myhealth.local.v1',
            JSON.stringify({
              profile,
              advices: { [advice.date]: advice },
              logs: {},
              settings: { theme: 'system' },
            }),
          );
        },
        { profile: sampleProfile, advice },
      );
    }

    await page.goto(path);
    await expect(page.getByText('MyHealth')).toBeVisible();
  });
}
