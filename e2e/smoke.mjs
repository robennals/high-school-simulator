// Smoke test: create a character and play the first two weeks in a real browser, taking screenshots,
// through two weekly recaps.   node e2e/smoke.mjs <url> <screenshot-dir>
import { chromium } from 'playwright';

const [url = 'http://localhost:5317/', outDir = '.'] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`));
const shots = new Set();
const once = async (name) => {
  if (shots.has(name)) return;
  shots.add(name);
  await page.screenshot({ path: `${outDir}/${name}.png` });
};

await page.goto(url);
await page.waitForSelector('.title-screen');
await page.waitForTimeout(1200);
await once('00-title');
await page.click('.menu-btn:has-text("How to Play")');
// Step through every page of the guide, then close it.
for (let i = 1; await page.$('.guide'); i++) {
  await page.waitForTimeout(500); // let the fade-in finish
  await once(`00b-how-to-play-${i}`);
  await page.click('.guide .menu-btn.primary');
}
await page.waitForSelector('.guide', { state: 'detached' });
await page.click('.title-screen .menu-btn.primary');
await page.waitForSelector('.create');
await once('01-create');
await page.click('.create-actions button.big');
await page.waitForSelector('.modal-card');
await once('02-signup');
await page.click('.modal-card .option');

// Play two weeks, through two recaps: handle whatever the game is asking for.
let recaps = 0;
let idle = 0;
for (let step = 0; step < 1200; step++) {
  await page.waitForTimeout(120);
  if (await page.$('.modal:not(.hidden) .event-tag')) {
    await once('05b-event');
    await page.click('.modal:not(.hidden) .option');
    continue;
  }
  if (await page.$('.modal:not(.hidden) .modal-card')) {
    await page.waitForTimeout(300);
    recaps++;
    await once(`09-recap-week${recaps}`);
    if (recaps >= 2) break;
    await page.click('.modal:not(.hidden) button.big');
    continue;
  }
  // Before school: walk up to the first group listed.
  if ((await page.$('.panel :text("who do you walk up to")')) || (await page.$('.panel :text("Try someone else?")'))) {
    await page.waitForTimeout(1500); // camera flight
    await once('02c-hallway-groups');
    await page.click('.panel .row.wrap .chip');
    continue;
  }
  // The first time in each class, you pick a seat: the first time, hover the room and click an open desk.
  const seatTitle = await page.$eval('.panel .panel-title', (e) => e.textContent ?? '').catch(() => '');
  if (seatTitle.includes('period') && seatTitle.includes('where do you sit?')) {
    if (!shots.has('02e-seat-picker')) {
      await page.waitForTimeout(1800); // camera flight
      await once('02d-first-class');
      const box = await page.locator('#scene canvas').boundingBox();
      for (let y = 0.3; y < 0.75 && !(await page.$('.panel :text("This desk")')); y += 0.05)
        for (let x = 0.3; x < 0.7 && !(await page.$('.panel :text("This desk")')); x += 0.04) await page.mouse.move(box.x + box.width * x, box.y + box.height * y);
      if (await page.$('.panel :text("This desk")')) await page.mouse.down().then(() => page.mouse.up());
      await page.waitForTimeout(400);
      await once('02e-seat-picker');
    }
    await page.click('.panel button.big');
    continue;
  }
  if (await page.$('.panel :text("Getting dressed")')) {
    await once('02b-getting-dressed');
    const looks = await page.$$('.panel .row.wrap .chip');
    if (looks.length > 2) await looks[2].click();
    await page.click('.panel button.big');
    continue;
  }
  const chip = await page.$('.panel .row.wrap .chip');
  if (chip && (await page.$('.panel :text("where do you sit")'))) {
    await once('03-lunch-pick');
    await chip.click();
    await page.waitForTimeout(150);
    await page.click('.panel .table-info button.big');
    continue;
  }
  if (await page.$('.panel button:has-text("Sit by yourself")')) {
    await page.click('.panel button:has-text("Sit by yourself")');
    continue;
  }
  const cards = await page.$$('.panel .hand .card');
  if (cards.length) {
    if (!shots.has('04-conversation')) {
      await once('04-conversation');
      await page.keyboard.press('Escape');
      await page.waitForSelector('.pause-card');
      await once('04b-pause-menu');
      await page.keyboard.press('Escape');
    }
    if (await page.$('.panel .warn')) await once('05-challenge');
    // Play the first card you can (not greyed out); with none playable, head out.
    const playable = await page.$('.panel .hand .card:not(.unplayable)');
    if (playable) await playable.click();
    else await page.click('.panel .head-out');
    continue;
  }
  const big = await page.$('.panel button.big');
  if (big) {
    const label = await big.innerText();
    // Let the camera finish flying before taking a picture of a new place.
    const title = await page.$eval('.panel .panel-title', (e) => e.textContent ?? '').catch(() => '');
    const name = title.startsWith('Before school')
      ? '02c-before-school'
      : title.startsWith('Walking to')
        ? '02h-walk-to-class-end'
        : label === 'Head home'
          ? '07b-after-school-place'
          : '06-after-lunch';
    if (!shots.has(name)) await page.waitForTimeout(1800);
    await once(name);
    await big.click();
    continue;
  }
  const opt = await page.$('.panel .option:not([disabled])');
  if (opt) {
    if (await page.$('.panel :text("On the way to 1st period")')) await once('02g-walk-to-class');
    if (await page.$('.panel :text("Whisper to")')) {
      await page.waitForTimeout(1500); // camera flight into the classroom
      await once('02i-class-moment');
    }
    if (await page.$('.panel :text("Who do you hang out with?")')) await once('07c-practice');
    if (await page.$('.panel :text("After school")')) await once('07-after-school');
    if (await page.$('.panel :text("Tonight")')) await once('08-evening');
    await opt.click();
    idle = 0;
    continue;
  }
  // Nothing we know how to handle: give it a moment, then report where we got stuck.
  if (++idle > 40) {
    await page.screenshot({ path: `${outDir}/stuck.png` });
    console.log('STUCK — panel says:', await page.$eval('.panel', (e) => e.textContent).catch(() => '(no panel)'));
    process.exitCode = 1;
    break;
  }
}
console.log(errors.length ? errors.join('\n') : 'no errors');
await browser.close();
