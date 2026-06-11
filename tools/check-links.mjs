// Verify the built static site: every internal href/src resolves to a real
// file in _site, and no external font/origin leaks remain.
// Usage: node tools/check-links.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'site/_site';
function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}
const files = walk(ROOT);
const htmlFiles = files.filter(f => f.endsWith('.html'));
const exists = rel => {
  const base = path.join(ROOT, rel.replace(/[?#].*$/, ''));
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return true;
  if (fs.existsSync(path.join(base, 'index.html'))) return true;
  return false;
};

let internalChecked = 0, broken = [], externalOrigin = [], googleFonts = [];
const attrRe = /(?:href|src)="([^"]+)"/g;
for (const f of htmlFiles) {
  const html = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = attrRe.exec(html))) {
    const url = m[1];
    if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) googleFonts.push([f, url]);
    if (/^https?:\/\//.test(url)) {
      if (url.includes('aaronellis.co.network')) {
        // Canonical <link> and og:url intentionally use the absolute production URL.
        const ctx = html.slice(Math.max(0, m.index - 40), m.index);
        if (!/canonical|og:url/.test(ctx)) externalOrigin.push([f, url]);
      }
      continue; // external links not verified
    }
    if (url.startsWith('#') || url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('data:')) continue;
    if (!url.startsWith('/')) continue; // skip relative anchors-in-page edge cases
    internalChecked++;
    // /wp-content/uploads/*.mp3 intentionally lives on the host, not in _site.
    if (url.startsWith('/wp-content/uploads/')) continue;
    if (!exists(url)) broken.push([f.replace(ROOT + '/', ''), url]);
  }
}

console.log(`html pages: ${htmlFiles.length}`);
console.log(`internal links/assets checked: ${internalChecked}`);
console.log(`broken internal links: ${broken.length}`);
for (const [f, u] of broken.slice(0, 40)) console.log(`  BROKEN  ${u}   (in ${f})`);
console.log(`google-fonts refs (expect 0): ${googleFonts.length}`);
console.log(`absolute aaronellis.co.network refs in attrs (expect 0): ${externalOrigin.length}`);
for (const [f, u] of externalOrigin.slice(0, 10)) console.log(`  ORIGIN  ${u}   (in ${f.replace(ROOT + '/', '')})`);
process.exit(broken.length || googleFonts.length || externalOrigin.length ? 1 : 0);
