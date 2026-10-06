#!/usr/bin/env node
// Builds the phone lab: lab-src.html with every lab script inlined.
//
//   node tools/build-lab.mjs           writes index.html (a full HTML document, for a static host
//                                      such as Vercel or for opening locally) and artifact.html
//                                      (the same page as a fragment, the form a claude.ai artifact
//                                      takes; the artifact host adds the doctype, html and body)
//   node tools/build-lab.mjs --local   also writes out/lab-local.html, the same page with GSAP from
//                                      vendor/gsap.min.js, for checking it without internet
//
// The placeholder comment <!-- INLINE --> in lab-src.html becomes one <script> block per file, in
// this order: coach.js, motion.js, every anims/*.js (alphabetical; they register into
// BraviloMotion.ANIMS, so they must come after motion.js), player.js. Node and fs only.
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const LAB = join(dirname(fileURLToPath(import.meta.url)), '..');
const MARK = '<!-- INLINE -->';
const CDN_GSAP = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/gsap.min.js';

function fail(msg) {
  console.error('build-lab: ' + msg);
  process.exit(1);
}

const src = readFileSync(join(LAB, 'lab-src.html'), 'utf8');
const marks = src.split(MARK).length - 1;
if (marks !== 1) fail(`lab-src.html must contain ${MARK} exactly once (found ${marks})`);
if (!src.includes(CDN_GSAP)) fail('lab-src.html must load GSAP from ' + CDN_GSAP);
if (src.indexOf(CDN_GSAP) > src.indexOf(MARK)) fail('GSAP must load before ' + MARK);

const anims = readdirSync(join(LAB, 'anims')).filter((f) => f.endsWith('.js')).sort();
if (!anims.length) fail('no anims/*.js files');
const files = ['coach.js', 'motion.js', ...anims.map((f) => 'anims/' + f), 'player.js'];

const blocks = files.map((f) => {
  let code = readFileSync(join(LAB, f), 'utf8');
  // Keep the HTML parser inside the script: a literal "</script" or "<!--" would end or confuse it.
  code = code.replace(/<\/(script)/gi, '<\\/$1');
  if (/<!--/.test(code)) fail(f + ' contains "<!--"; remove it before inlining');
  return `<script data-src="${f}">\n${code.trimEnd()}\n</script>`;
}).join('\n');

// A function replacement, so "$" sequences in the sources are never treated as patterns.
const page = src.replace(MARK, () => blocks);
writeFileSync(join(LAB, 'artifact.html'), page);
// The fragment starts with its head elements and then the body's content, so a doctype and an
// html element around it make a standards-mode document; the parser places head and body.
const doc = '<!doctype html>\n<html lang="en">\n' + page.trimEnd() + '\n</html>\n';
writeFileSync(join(LAB, 'index.html'), doc);
const kb = (Buffer.byteLength(doc) / 1024).toFixed(1);
console.log(`index.html  ${kb} KB  (${files.length} scripts: ${files.join(', ')})`);
console.log('artifact.html  (the same page as a fragment, for claude.ai)');

if (process.argv.includes('--local')) {
  mkdirSync(join(LAB, 'out'), { recursive: true });
  const local = page.replace(CDN_GSAP, '../vendor/gsap.min.js');
  writeFileSync(join(LAB, 'out', 'lab-local.html'), local);
  console.log('out/lab-local.html  (GSAP from vendor/)');
}
