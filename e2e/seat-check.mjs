// Checks class seat picking in a real browser: hovering an open desk previews your neighbors, and
// clicking it moves you there.   node e2e/seat-check.mjs <url> [screenshot]
import { chromium } from 'playwright';

const [url = 'http://localhost:5317/', shot] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const panelText = () => page.$eval('.panel', (e) => e.textContent ?? '');

await page.goto(url);
await page.click('.title-screen .menu-btn.primary');
await page.click('.create-actions button.big');
await page.waitForSelector('.modal-card .option');
await page.click('.modal-card .option');
await page.waitForSelector('.panel :text("Getting dressed")');
await page.click('.panel button.big');
// Seats are picked one class at a time on the first day; the before-school button opens the full list.
await page.waitForSelector('.panel :text("Change class seats")');
await page.click('.panel .seats-btn');
await page.waitForSelector('.panel :text("Change where you sit")');
const listBefore = await page.$eval('.panel .option', (e) => e.textContent);
await page.click('.panel .option');
await page.waitForTimeout(2000); // camera flight
const box = await page.locator('#scene canvas').boundingBox();
let found = null;
outer: for (let y = 0.15; y < 0.8; y += 0.02)
  for (let x = 0.1; x < 0.9; x += 0.02) {
    await page.mouse.move(box.x + box.width * x, box.y + box.height * y);
    if ((await panelText()).includes('This desk')) {
      found = { x, y };
      break outer;
    }
  }
console.log('hover found an open desk:', !!found);
if (found) {
  console.log('preview:', (await panelText()).match(/This desk:[^.]*\./)?.[0]);
  await page.mouse.click(box.x + box.width * found.x, box.y + box.height * found.y);
  await page.waitForTimeout(300);
  console.log('after click:', (await panelText()).match(/Your seat now:[^.]*\./)?.[0]);
}
if (shot) await page.screenshot({ path: shot });
await page.click('.panel button.big');
const listAfter = await page.$eval('.panel .option', (e) => e.textContent);
console.log('1st period before:', listBefore);
console.log('1st period after: ', listAfter);
console.log(errors.length ? errors.join('\n') : 'no errors');
await browser.close();
