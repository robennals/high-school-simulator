// Checks the profile screen's name fields the way a person uses them: switching gender gives an
// untouched random name a new one that fits; clicking a box and typing replaces the name; a typed
// name survives switching gender; and the game uses it.   node e2e/name-check.mjs <url> [screenshot]
import { chromium } from 'playwright';

const [url = 'http://localhost:5317/', shot] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const report = (label, value) => console.log(`${label.padEnd(44)} ${JSON.stringify(value)}`);
const names = () => page.$$eval('.create input.name', (els) => els.map((e) => e.value));
const otherGender = '.create button.chip:not(.on):text-matches("^(Girl|Boy)$")';

await page.goto(url);
await page.click('.menu-btn.primary');
await page.waitForSelector('.create input.name');
report('generated name', await names());
const before = await names();
await page.click(otherGender);
report('after switching gender (untouched name)', await names());
report('  …new name?', JSON.stringify(before) !== JSON.stringify(await names()));
await page.click('.create input.name >> nth=0');
await page.keyboard.type('Jordan');
await page.click('.create input.name >> nth=1');
await page.keyboard.type('Rivera');
report('after clicking each box and typing', await names());
await page.click(otherGender);
report('after switching gender (typed name)', await names());
if (shot) await page.screenshot({ path: shot });
await page.click('.create-actions button.big');
await page.waitForSelector('.modal-card .option');
await page.click('.modal-card .option');
await page.waitForSelector('.hud-name');
report('name shown in game', await page.$eval('.hud-name', (e) => e.textContent));
await browser.close();
