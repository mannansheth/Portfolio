import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import bcrypt from 'bcryptjs';
import { query, pool } from '../backend/src/db.js';
const email = `theme-check-${crypto.randomBytes(6).toString('hex')}@example.com`,
  password = crypto.randomBytes(20).toString('hex');
const slug = `private-browser-${crypto.randomBytes(6).toString('hex')}`;
let browser;
try {
  await query('INSERT INTO administrators(email,password_hash) VALUES (?,?)', [
    email,
    await bcrypt.hash(password, 12),
  ]);
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    colorScheme: 'light',
  });
  const page = await context.newPage(),
    errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/');
  await page.getByRole('heading', { level: 1 }).waitFor();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
  assert.equal(await page.evaluate(() => localStorage.getItem('portfolio-theme')), 'dark');
  await page.reload();
  await page.getByRole('button', { name: 'Switch to light mode' }).waitFor();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  await fs.mkdir('.local/screenshots', { recursive: true });
  await page.screenshot({ path: '.local/screenshots/home-dark-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.getByRole('button', { name: 'Menu' }).click();
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: /Contact/ })
    .click();
  await page.getByRole('heading', { name: 'Let’s talk.' }).waitFor();
  await page.screenshot({ path: '.local/screenshots/contact-dark-mobile.png', fullPage: true });
  await page.goto('http://127.0.0.1:5173/admin');
  await page.getByRole('button', { name: 'Switch to light mode' }).waitFor();
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.locator('.admin-project').first().waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: '.local/screenshots/admin-dark-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: '.local/screenshots/admin-dark-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'GitHub import', exact: true }).click();
  await page.route('**/api/admin/github/repositories?source=accessible', (route) =>
    route.fulfill({
      json: {
        data: {
          source: 'accessible',
          complete: true,
          repositories: [
            {
              name: 'private-fixture',
              owner: 'example',
              url: 'https://github.com/example/private-fixture',
              private: true,
              language: 'JavaScript',
              description: 'Private browser fixture.',
            },
          ],
        },
      },
    }),
  );
  await page.route('**/api/admin/github/inspect', (route) =>
    route.fulfill({
      json: {
        data: {
          owner: 'example',
          repo: 'private-fixture',
          url: 'https://github.com/example/private-fixture',
          private: true,
          description: 'Private browser fixture.',
          homepage: '',
          languages: ['JavaScript'],
          structure: ['server.js'],
          files: [{ path: 'server.js', text: 'app.get("/projects", handler);' }],
          warnings: [],
        },
      },
    }),
  );
  await page.getByRole('button', { name: 'Browse token-accessible repositories' }).click();
  await page.locator('.repo-item').filter({ hasText: 'private-fixture' }).waitFor();
  await page.getByLabel('Filter', { exact: true }).selectOption('private');
  assert.equal(await page.locator('.repo-item').count(), 1);
  await page.getByRole('button', { name: 'Inspect', exact: true }).click();
  await page.locator('.privacy-notice').waitFor();
  assert.equal(
    await page.getByRole('button', { name: 'Generate draft with Gemini' }).isDisabled(),
    true,
  );
  await page.getByLabel('Allow sending the selected private source evidence to Gemini').check();
  assert.equal(
    await page.getByRole('button', { name: 'Generate draft with Gemini' }).isEnabled(),
    true,
  );
  await page.getByRole('button', { name: 'Use metadata & write manually' }).click();
  await page.getByLabel('Slug', { exact: true }).fill(slug);
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Draft saved' }).waitFor();
  await page.getByLabel('Status', { exact: true }).selectOption('published');
  await page.getByRole('button', { name: 'Save & publish' }).click();
  await page.getByRole('alert').filter({ hasText: 'approve' }).waitFor();
  await page.getByLabel('I approve making this portfolio content public').check();
  await page.getByRole('button', { name: 'Save & publish' }).click();
  await page.getByRole('status').filter({ hasText: 'Project published' }).waitFor();
  const publicPage = await context.newPage();
  await publicPage.goto(`http://127.0.0.1:5173/work/${slug}`);
  await publicPage.getByRole('heading', { name: 'private-fixture', exact: true }).waitFor();
  assert.equal(await publicPage.getByRole('link', { name: 'View repository' }).count(), 0);
  await publicPage.close();
  await page.getByRole('button', { name: 'Switch to light mode' }).click();
  await page.goto('http://127.0.0.1:5173/');
  await page.getByRole('button', { name: 'Switch to dark mode' }).waitFor();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
  const systemContext = await browser.newContext({ colorScheme: 'dark' });
  const systemPage = await systemContext.newPage();
  await systemPage.goto('http://127.0.0.1:5173/');
  await systemPage.getByRole('button', { name: 'Switch to light mode' }).waitFor();
  assert.equal(await systemPage.locator('html').getAttribute('data-theme'), 'dark');
  await systemContext.close();
  assert.deepEqual(errors, []);
  console.log(
    'Browser checks passed: theme toggle, reload/route persistence, system preference, mobile dark navigation, admin dark mode, private import controls, guarded publication, hidden private GitHub link. Private discovery/source responses mocked; project saves and publication used the real API.',
  );
} finally {
  if (browser) await browser.close();
  await query('DELETE FROM projects WHERE slug=?', [slug]);
  await query('DELETE FROM administrators WHERE email=?', [email]);
  await pool.end();
}
