// Self-host the Google Fonts the wiki/prompt/guide pages use, so the build has
// no external font dependency. Fetches the css2 stylesheet, keeps the latin +
// latin-ext subsets, downloads the woff2 files into site/assets/fonts/, and
// writes site/src/css/fonts.css with local @font-face rules.
// Usage: node tools/fetch-fonts.mjs
import fs from 'node:fs';
import path from 'node:path';

const CSS_URL = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Oswald:wght@400;500;600;700&family=Cinzel:wght@600;700&display=swap";
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const KEEP = new Set(['latin', 'latin-ext']);
const OUT_FONTS = 'site/assets/fonts';
const OUT_CSS = 'site/src/css/fonts.css';

const res = await fetch(CSS_URL, { headers: { 'User-Agent': UA } });
const css = await res.text();

fs.mkdirSync(OUT_FONTS, { recursive: true });

// Split into "/* subset */ @font-face {...}" chunks.
const chunks = css.split(/\/\*\s*([\w-]+)\s*\*\//).slice(1); // [subset, block, subset, block, ...]
const faces = [];
const downloads = [];
for (let i = 0; i < chunks.length; i += 2) {
  const subset = chunks[i].trim();
  const block = chunks[i + 1] || '';
  if (!KEEP.has(subset)) continue;
  const family = (block.match(/font-family:\s*'([^']+)'/) || [])[1];
  const weight = (block.match(/font-weight:\s*(\d+)/) || [])[1];
  const url = (block.match(/src:\s*url\(([^)]+)\)/) || [])[1];
  const range = (block.match(/unicode-range:\s*([^;]+);/) || [])[1];
  if (!family || !weight || !url) continue;
  const fname = `${family}-${weight}-${subset}.woff2`;
  downloads.push({ url, fname });
  faces.push(`@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};font-display:swap;src:url(/assets/fonts/${fname}) format('woff2');unicode-range:${range};}`);
}

let ok = 0, bytes = 0;
for (const d of downloads) {
  const dest = path.join(OUT_FONTS, d.fname);
  if (fs.existsSync(dest)) { ok++; continue; }
  const r = await fetch(d.url, { headers: { 'User-Agent': UA } });
  const buf = Buffer.from(await r.arrayBuffer());
  fs.writeFileSync(dest, buf);
  ok++; bytes += buf.length;
}

fs.writeFileSync(OUT_CSS, '/* Self-hosted fonts (latin + latin-ext) — replaces the Google Fonts @import. */\n' + faces.join('\n') + '\n');
console.log(`downloaded ${ok} font files (${(bytes / 1024).toFixed(0)} KB), wrote ${faces.length} @font-face rules -> ${OUT_CSS}`);
