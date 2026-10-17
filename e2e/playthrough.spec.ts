import { expect, test, type Page } from '@playwright/test';

/** Clicks through any open story dialogue, picking choice `pick` when asked. */
async function playDialogues(page: Page, pick = 0): Promise<void> {
  for (let i = 0; i < 300; i++) {
    if (!(await page.locator('.dlg-box').count())) return;
    const choices = page.locator('.dlg-choices button[data-choice]:not([disabled])');
    if (await choices.count()) {
      await choices.nth(Math.min(pick, (await choices.count()) - 1)).click();
      await page.waitForTimeout(120);
      continue;
    }
    await page.keyboard.press('Enter');
    await page.waitForTimeout(30);
  }
}

async function clickTile(page: Page, x: number, y: number): Promise<void> {
  const p = await page.evaluate(([tx, ty]) => window.__game.tile(tx, ty), [x, y]);
  expect(p).not.toBeNull();
  await page.mouse.click(p!.x, p!.y);
}

async function newCampaign(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: /Нова кампания/ }).click();
  await page.getByRole('button', { name: /Нормално/ }).click();
  await expect(page.getByText('Откраднатата карта').first()).toBeVisible();
  await page.locator('#start-scenario').click();
  await expect(page.locator('.dlg-box')).toBeVisible();
  await playDialogues(page);
  await expect(page.locator('.hero-card')).toContainText('Мишконтин');
}

function summary(page: Page) {
  return page.evaluate(() => {
    const s = window.__game.state()!;
    const m = s.heroes.find((h) => h.id === 'mishkontin')!;
    return { scenario: s.scenario, day: s.day, x: m.x, y: m.y, mp: m.mp, xp: m.xp, army: m.army, res: s.players.player.res, flags: s.flags, virtues: s.virtues, items: s.items };
  });
}

test('chapter 1: town, battle, story choice, save and load', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await newCampaign(page);

  // Town: build a market and recruit militia.
  await page.locator('.town-card').first().click();
  await expect(page.locator('.town h2')).toHaveText('Мъхово');
  await page.locator('.bld.can', { hasText: 'Пазар' }).click();
  await expect(page.locator('.bld.built', { hasText: 'Пазар' })).toBeVisible();
  const recruitRow = page.locator('.recruit-row', { hasText: 'Мишка-опълченец' });
  await recruitRow.getByRole('button', { name: 'Наеми' }).click();
  await page.getByRole('button', { name: 'Купи' }).click();
  await expect(page.locator('.recruit-row', { hasText: 'Мишка-опълченец' })).toContainText('Свободни: 0');
  await page.keyboard.press('Escape');

  // Walk to the spiders in the swamp and fight.
  await clickTile(page, 6, 17);
  await clickTile(page, 6, 17);
  await expect(page.locator('.combat')).toBeVisible();
  await page.getByRole('button', { name: /Бързо/ }).click();
  await expect(page.getByText('Победа!')).toBeVisible();
  await page.getByRole('button', { name: 'Продължи' }).click();
  // Letokril in the web: a story choice that sets flags and virtues.
  await expect(page.locator('.dlg-box')).toBeVisible();
  await playDialogues(page, 0);
  const afterChoice = await summary(page);
  expect(afterChoice.flags.letokril_freed).toBe(true);
  expect(afterChoice.virtues.kindness).toBeGreaterThanOrEqual(1);

  // Save into slot 1.
  await page.getByRole('button', { name: /Запис/ }).click();
  await page.locator('.save-slot', { hasText: 'Място 1' }).getByRole('button', { name: 'Запиши' }).click();
  await expect(page.getByText('Играта е записана.')).toBeVisible();
  await page.getByRole('button', { name: 'Добре' }).click();
  await page.keyboard.press('Escape');
  const saved = await summary(page);

  // Reload the page and load the save from the main menu.
  await page.reload();
  await page.getByRole('button', { name: /Зареди игра/ }).click();
  await page.locator('.save-slot', { hasText: 'Място 1' }).getByRole('button', { name: 'Зареди' }).click();
  await expect(page.locator('.hero-card')).toContainText('Мишконтин');
  expect(await summary(page)).toEqual(saved);
  expect(errors).toEqual([]);
});

test('chapter 1 can be won and the campaign continues to chapter 2', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await newCampaign(page);
  // The test bot plays the rest of the chapter with the real game rules.
  const status = await page.evaluate(() => window.__game.botFinish(60));
  expect(status).toBe('won');
  await expect(page.getByText('Главата е завършена!')).toBeVisible();
  const level = await page.evaluate(() => window.__game.state()!.heroes.find((h) => h.id === 'mishkontin')!.level);
  await page.locator('#next-chapter').click();
  await expect(page.getByText('Пътеката на Картографа').first()).toBeVisible();
  await page.locator('#start-scenario').click();
  await expect(page.locator('.dlg-box')).toBeVisible();
  await playDialogues(page);
  const s2 = await summary(page);
  expect(s2.scenario).toBe('s2');
  expect(s2.items).toEqual(expect.arrayContaining(['map1', 'map2', 'map3']));
  const level2 = await page.evaluate(() => window.__game.state()!.heroes.find((h) => h.id === 'mishkontin')!.level);
  expect(level2).toBe(level);
  expect(errors).toEqual([]);
});
