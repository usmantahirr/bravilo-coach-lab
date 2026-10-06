#!/usr/bin/env node
// Phone-width screenshot of a lab page with Playwright's mobile emulation (isMobile, touch,
// deviceScaleFactor 2), which honours the page's viewport meta. Use this, not tools/shot.sh, for
// widths under 500 px: headless Chrome will not lay a page out narrower than its minimum window
// width, so shot.sh clips the right edge at phone widths.
//
//   node tools/phone-shot.mjs <page> "<query>" <out.png> [width=390] [height=844] [light|dark] [full]
//   node tools/phone-shot.mjs out/lab-local.html "" out/x-390-dark.png 390 844 dark full
//
// Prints console errors and horizontal overflow (scrollWidth > clientWidth) if there are any.
import { chromium } from 'playwright';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const LAB = join(dirname(fileURLToPath(import.meta.url)), '..');
const [page, query = '', out, w = '390', hgt = '844', scheme = 'light', full = ''] = process.argv.slice(2);
if (!page || !out) { console.error('usage: phone-shot.mjs <page> "<query>" <out.png> [width] [height] [light|dark] [full]'); process.exit(1); }
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: +w, height: +hgt }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: scheme === 'dark' ? 'dark' : 'light' });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
await p.goto('file://' + resolve(LAB, page) + (query ? '?' + query : ''));
await p.waitForTimeout(1200);
const ov = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
const target = resolve(LAB, out);
await p.screenshot({ path: target, fullPage: full === 'full' });
console.log(target);
if (ov.sw > ov.cw) console.log('horizontal overflow: scrollWidth ' + ov.sw + ' > clientWidth ' + ov.cw);
if (errs.length) console.log(errs.filter((e) => !/fonts\.(googleapis|gstatic)/.test(e)).join('\n') || 'only font-loading errors');
await b.close();
