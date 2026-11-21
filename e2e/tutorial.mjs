// Tutorial check: start the tutorial from the title screen and play the first day, taking a
// screenshot of every coach tip, until the end-of-day tip.   node e2e/tutorial.mjs <url> <screenshot-dir>
// Clicks go through the DOM (not the mouse), so a slow, busy machine doesn't time them out.
import { chromium } from 'playwright';

const [url = 'http://localhost:5317/', outDir = '.'] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
page.setDefaultTimeout(90000);
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`));
const tap = (sel, i = 0) => page.evaluate(([s, i]) => document.querySelectorAll(s)[i]?.click(), [sel, i]);
const has = (sel) => page.$(sel).then(Boolean);
const text = (sel) => page.$eval(sel, (e) => e.textContent ?? '').catch(() => '');

await page.goto(url);
await page.waitForSelector('.title-screen');
await page.waitForTimeout(1000);
await page.screenshot({ path: `${outDir}/00-title.png` });
await tap('.menu-btn:not(.primary)', 0); // Tutorial
await page.waitForSelector('.coach-welcome');
for (let i = 1; await has('.coach-welcome'); i++) {
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${outDir}/01-welcome-${i}.png` });
  await tap('.coach-welcome .menu-btn.primary');
}
const tips = [];
for (let step = 0; step < 2000; step++) {
  await page.waitForTimeout(250);
  if (await has('.coach:not(.hidden)')) {
    const title = await text('.coach-title');
    if (!tips.includes(title)) {
      tips.push(title);
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${outDir}/tip-${String(tips.length).padStart(2, '0')}.png` });
    }
    if (title === 'That was your first day') break;
    await tap('.coach-ok');
    continue;
  }
  if (await has('.create')) {
    await tap('.create-actions button.big');
    continue;
  }
  if (await has('.modal:not(.hidden) .option')) {
    await tap('.modal:not(.hidden) .option');
    continue;
  }
  if (await has('.panel .table-info button.big')) {
    await tap('.panel .table-info button.big');
    continue;
  }
  const title = await text('.panel .panel-title');
  if ((title.startsWith('Before school —') || title.startsWith('Try another') || title.includes('where do you sit')) && (await has('.panel .row.wrap .chip'))) {
    await tap('.panel .row.wrap .chip');
    continue;
  }
  if (await has('.panel .hand .card:not(.unplayable)')) {
    await tap('.panel .hand .card:not(.unplayable)');
    continue;
  }
  if (await has('.panel .head-out')) {
    await tap('.panel .head-out');
    continue;
  }
  if (await has('.panel .option:not([disabled])')) {
    await tap('.panel .option:not([disabled])');
    continue;
  }
  if (await has('.panel button.big')) await tap('.panel button.big');
}
console.log('coach tips, in order:\n  ' + tips.join('\n  '));
console.log(errors.length ? errors.join('\n') : 'no errors');
await browser.close();
