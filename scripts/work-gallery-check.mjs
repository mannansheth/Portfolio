import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const origin = 'http://127.0.0.1:5173';
const browser = await chromium.launch({ headless: true });
const errors = [];
await fs.mkdir('.local/screenshots/work', { recursive: true });
const settle = (page) =>
  page.evaluate(async () => {
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await Promise.all(
      document
        .querySelector('.folio-gallery')
        .getAnimations({ subtree: true })
        .map((a) => a.finished.catch(() => {})),
    );
  });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    colorScheme: 'light',
  });
  page.on('pageerror', (error) => errors.push(error.message));
  const { data: projects } = await (await page.request.get(`${origin}/api/projects`)).json();
  async function load(path = '/work') {
    await page.goto(`${origin}${path}`);
    await page.locator('.folio-slot').first().waitFor();
    await settle(page);
  }
  await load('/');
  assert.equal(
    await page.locator('.folio-slot').count(),
    projects.filter((p) => p.featured).length,
  );
  await load();
  assert.equal(await page.locator('.folio-slot').count(), projects.length);
  const sizes = [];
  for (let index = 0; index < projects.length; index++) {
    const project = projects[index];
    const card = page.locator('.folio-slot').nth(index);
    await card.scrollIntoViewIfNeeded();
    await settle(page);
    const size = await card.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      let opacity = 1;
      for (let node = el; node; node = node.parentElement)
        opacity *= Number(getComputedStyle(node).opacity);
      return { x: rect.x, width: rect.width, height: rect.height, opacity };
    });
    assert.equal(size.opacity, 1, `${project.title} is visible`);
    assert.ok(size.height > size.width, `${project.title} is portrait`);
    sizes.push(size);
    const notes = card.locator('.folio-actions').getByRole('link', { name: 'Project notes' });
    assert.equal(await notes.getAttribute('href'), `/work/${project.slug}`);
    const demos = card.locator('.folio-actions').getByRole('link', { name: 'Live demo' });
    assert.equal(await demos.count(), project.demoUrl ? 1 : 0);
    if (project.demoUrl) assert.equal(await demos.getAttribute('href'), project.demoUrl);
    const github = card.locator('.folio-actions').getByRole('link', { name: 'GitHub' });
    if (project.repositoryUrl)
      assert.equal(await github.getAttribute('href'), project.repositoryUrl);
    for (const external of await card.locator('.folio-actions a[target="_blank"]').all()) {
      assert.match(await external.getAttribute('rel'), /noopener/);
    }
    await notes.click();
    await page.getByRole('heading', { level: 1, name: project.title, exact: true }).waitFor();
    await page.goBack();
    await page.locator('.folio-slot').first().waitFor();
  }
  async function scrollTo(y) {
    await page.evaluate((y) => window.scrollTo(0, y), y);
    await settle(page);
  }
  async function scale(index) {
    return page
      .locator('.folio-slot')
      .nth(index)
      .evaluate((el) => parseFloat(el.style.getPropertyValue('--stack-scale')));
  }
  for (const [width, height] of [
    [1440, 900],
    [1440, 760],
    [390, 844],
    [320, 740],
  ]) {
    await page.setViewportSize({ width, height });
    await load();
    const geometry = await page.locator('.folio-slot').evaluateAll((els) =>
      els.map((el) => ({
        top: el.getBoundingClientRect().top + scrollY,
        height: el.offsetHeight,
        pin: parseFloat(getComputedStyle(el).top),
        position: getComputedStyle(el).position,
        background: getComputedStyle(el.querySelector('.folio-surface')).backgroundColor,
      })),
    );
    assert.ok(
      geometry.every((g) => g.position === 'sticky'),
      'sticky at every viewport',
    );
    assert.ok(
      geometry.every((g) => g.background === geometry[0].background),
      'identical card palette',
    );
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      'no horizontal overflow',
    );
    for (let i = 0; i < geometry.length - 1; i++) {
      const start = geometry[i + 1].top - geometry[i].pin - geometry[i].height * 0.85;
      const end = geometry[i + 1].top - geometry[i + 1].pin;
      await scrollTo(start);
      const before = await scale(i);
      for (let step = 1; step <= 6; step++) {
        await scrollTo(start + ((end - start) * step) / 6);
        if (step === 3) {
          const overlap = await page.evaluate((i) => {
            const slots = [...document.querySelectorAll('.folio-slot')];
            const a = slots[i].querySelector('.folio-surface').getBoundingClientRect();
            const b = slots[i + 1].querySelector('.folio-surface').getBoundingClientRect();
            const top = Math.max(a.top, b.top),
              bottom = Math.min(a.bottom, b.bottom, innerHeight);
            const left = Math.max(a.left, b.left),
              right = Math.min(a.right, b.right);
            const hit = document.elementFromPoint(
              (left + right) / 2,
              top + Math.min(30, (bottom - top) / 2),
            );
            return {
              area: (right - left) * (bottom - top),
              front: hit?.closest('.folio-slot') === slots[i + 1],
            };
          }, i);
          assert.ok(overlap.area > 10000, `cards ${i + 1}/${i + 2} overlap at ${width}x${height}`);
          assert.ok(overlap.front, 'incoming card is physically above the prior card');
          if (i === 0)
            await page.screenshot({ path: `.local/screenshots/work/stack-${width}-${height}.png` });
        }
      }
      assert.ok((await scale(i)) < before, 'prior card recedes with scroll');
      const exposed = await page.evaluate((i) => {
        const cards = [...document.querySelectorAll('.folio-surface')];
        return cards[i + 1].getBoundingClientRect().top - cards[i].getBoundingClientRect().top;
      }, i);
      assert.ok(exposed > 3, 'earlier top edge remains visible');
      for (let step = 5; step >= 0; step--) await scrollTo(start + ((end - start) * step) / 6);
      assert.ok(Math.abs((await scale(i)) - before) < 0.003, 'scroll reversal restores depth');
    }
    console.log(`All five card handoffs overlap and reverse at ${width}x${height}.`);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await load();
  await page.locator('.folio-slot').first().scrollIntoViewIfNeeded();
  await settle(page);
  await page.locator('.folio-surface').first().hover();
  await page.waitForFunction(() => document.querySelector('.folio-surface').dataset.lit === 'true');
  const spotlight = await page
    .locator('.folio-surface')
    .first()
    .evaluate((el) => ({
      x: el.style.getPropertyValue('--light-x'),
      paint: getComputedStyle(el, '::before').backgroundImage,
    }));
  assert.ok(spotlight.x && spotlight.paint.includes('radial-gradient'));
  await page.mouse.move(2, 2);
  await page.locator('.folio-slot').first().locator('.folio-actions a').first().focus();
  assert.equal(
    await page
      .locator('.folio-slot')
      .first()
      .evaluate((el) => getComputedStyle(el).zIndex),
    '20',
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await load();
  assert.equal(
    await page
      .locator('.folio-slot')
      .first()
      .evaluate((el) => getComputedStyle(el).position),
    'relative',
  );
  assert.equal(
    await page
      .locator('.folio-surface')
      .first()
      .evaluate((el) => getComputedStyle(el).transform),
    'none',
  );
  assert.equal(
    await page
      .locator('.folio-gallery')
      .evaluate((el) => el.getAnimations({ subtree: true }).length),
    0,
  );
  await page.screenshot({ path: '.local/screenshots/work/dark-reduced-motion.png' });

  await page.route('**/images/work/pathfinder.png', (route) => route.abort());
  await load();
  await page.locator('.folio-slot').nth(1).scrollIntoViewIfNeeded();
  await page.locator('.folio-slot').nth(1).locator('.folio-cover.is-poster').waitFor();
  assert.deepEqual(errors, []);
  console.log(
    `Verified ${projects.length} projects: visibility, uniform dark palette, real overlap and reversal at four viewport sizes, spotlight, notes navigation, demo/GitHub destinations, image fallback, dark mode, and reduced motion.`,
  );
} finally {
  await browser.close();
}
