import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import bcrypt from 'bcryptjs';
import { query, pool } from '../backend/src/db.js';
const email = `browser-${crypto.randomBytes(6).toString('hex')}@example.com`,
  password = crypto.randomBytes(20).toString('hex');
const slug = `browser-check-${crypto.randomBytes(6).toString('hex')}`;
const importSlug = `${slug}-import`;
let browser;
try {
  await query('INSERT INTO administrators (email,password_hash) VALUES (?,?)', [
    email,
    await bcrypt.hash(password, 12),
  ]);
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    }),
    errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/');
  await page.getByRole('heading', { level: 1 }).waitFor();
  assert.match(await page.title(), /Mannan/);
  assert.equal(await page.locator('.project-item').count(), 3);
  await fs.mkdir('.local/screenshots', { recursive: true });
  await page.screenshot({
    path: '.local/screenshots/home-desktop.png',
    fullPage: true,
  });
  await page.getByRole('link', { name: 'Read project notes' }).first().click();
  await page.getByRole('heading', { name: 'Curatus', exact: true }).waitFor();
  assert.ok(await page.getByRole('heading', { name: 'Architecture', exact: true }).isVisible());
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'About' })
    .click();
  await page.getByRole('heading', { name: 'Behind the work.' }).waitFor();
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: /Contact/ })
    .click();
  await page.getByLabel('Your name').fill('Browser verification');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('What’s on your mind?').fill('A temporary browser verification message.');
  await page.getByRole('button', { name: 'Send message' }).click();
  await page.getByRole('status').filter({ hasText: 'Your message has been received' }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:5173/');
  await page.getByRole('heading', { level: 1 }).waitFor();
  assert.ok(await page.getByRole('button', { name: 'Menu' }).isVisible());
  await page.getByRole('button', { name: 'Menu' }).click();
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Work', exact: true })
    .click();
  await page.getByRole('heading', { name: 'Selected work.', exact: true }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({
    path: '.local/screenshots/work-mobile.png',
    fullPage: true,
  });
  await page.goto('http://127.0.0.1:5173/');
  await page.getByRole('heading', { level: 1 }).waitFor();
  await page.screenshot({
    path: '.local/screenshots/home-mobile.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('http://127.0.0.1:5173/admin');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('heading', { name: 'Make it yours.' }).waitFor();
  await page.locator('.admin-project').first().waitFor();
  await page.screenshot({
    path: '.local/screenshots/admin-desktop.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'New project' }).click();
  await page.getByLabel('Project title').fill('Browser verified project');
  await page.getByLabel('Slug', { exact: true }).fill(slug);
  await page
    .getByLabel('Overview', { exact: true })
    .fill('A temporary project used to verify browser editing.');
  await page.getByLabel('Key features').fill('A verified browser workflow');
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await page.getByText('Unpublished preview').waitFor();
  await page.getByRole('button', { name: 'Return to editor' }).click();
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Draft saved' }).waitFor();
  await page.getByLabel('Status', { exact: true }).selectOption('published');
  await page.getByRole('button', { name: 'Save & publish' }).click();
  await page.getByRole('status').filter({ hasText: 'Project published' }).waitFor();
  const publicPage = await browser.newPage();
  await publicPage.goto(`http://127.0.0.1:5173/work/${slug}`);
  await publicPage
    .getByRole('heading', { name: 'Browser verified project', exact: true })
    .waitFor();
  await publicPage.close();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  const row = page.locator('.admin-project').filter({ hasText: 'Browser verified project' });
  await row.getByRole('button', { name: 'Unpublish', exact: true }).click();
  await row.getByText('draft', { exact: true }).waitFor();
  await row.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('button', { name: 'Delete project', exact: true }).click();
  await page.waitForFunction(
    () =>
      !Array.from(document.querySelectorAll('.admin-project')).some((x) =>
        x.textContent.includes('Browser verified project'),
      ),
  );
  await page.getByRole('button', { name: 'GitHub import', exact: true }).click();
  await page.getByRole('heading', { name: 'Import from GitHub.' }).waitFor();
  await page.getByRole('button', { name: 'Browse mannansheth’s repositories' }).click();
  await page.waitForFunction(
    () => document.querySelector('.repo-item') || document.querySelector('[role=alert]'),
  );
  console.log(
    'Live GitHub UI result:',
    (await page.locator('.feedback.error').allTextContents()).join(' ') ||
      `${await page.locator('.repo-item').count()} repositories`,
  );
  if (await page.locator('.repo-item').count()) {
    await page
      .locator('.repo-item')
      .filter({ has: page.getByRole('heading', { name: 'Affinity', exact: true }) })
      .getByRole('button', { name: 'Inspect', exact: true })
      .click();
    await page.waitForFunction(
      () => document.querySelector('.evidence-panel') || document.querySelector('[role=alert]'),
    );
    if (await page.locator('.evidence-panel').count()) {
      assert.ok(await page.locator('.evidence-panel details').count());
      await page.route('**/api/admin/github/generate', (route) =>
        route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Configure GEMINI_API_KEY to enable generation.' }),
        }),
      );
      await page.getByRole('button', { name: 'Generate draft with Gemini', exact: true }).click();
      await page.getByRole('alert').filter({ hasText: 'GEMINI_API_KEY' }).waitFor();
      await page.unroute('**/api/admin/github/generate');
      await page.getByRole('button', { name: 'Use metadata & write manually' }).click();
      await page.getByLabel('Slug', { exact: true }).fill(importSlug);
      await page.getByRole('button', { name: 'Save draft', exact: true }).click();
      await page.getByRole('status').filter({ hasText: 'Draft saved' }).waitFor();
      const imported = await query('SELECT repository_key,status FROM projects WHERE slug=?', [
        importSlug,
      ]);
      assert.equal(imported[0].repository_key, 'mannansheth/affinity');
      assert.equal(imported[0].status, 'draft');
      console.log(
        'Live GitHub inspection and metadata import passed; Gemini missing-key feedback passed.',
      );
      await page.getByRole('button', { name: 'Back', exact: true }).click();
    } else
      console.log(
        'Live repository inspection unavailable:',
        await page.getByRole('alert').allTextContents(),
      );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({
    path: '.local/screenshots/admin-mobile.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.getByRole('heading', { name: 'Welcome back.' }).waitFor();
  assert.deepEqual(errors, []);
  console.log(
    'Browser checks passed: public navigation, desktop/mobile overflow, project content, contact submission, admin login/logout, create/edit/preview/publish/unpublish/delete, GitHub error feedback.',
  );
} finally {
  if (browser) await browser.close();
  await query('DELETE FROM projects WHERE slug=?', [slug]);
  await query('DELETE FROM projects WHERE slug=?', [importSlug]);
  await query('DELETE FROM contacts WHERE email=?', [email]);
  await query('DELETE FROM administrators WHERE email=?', [email]);
  await pool.end();
}
