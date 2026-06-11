// Generate Eleventy source pages from the extracted WP content.
// Reads tools/extracted/{index.json,rendered/*.html} and writes
// site/src/<path>/index.html with front matter (layout/title/permalink).
// URLs are taken verbatim from the live WP `link` field to preserve SEO.
// Usage: node tools/build-src.mjs
import fs from 'node:fs';
import path from 'node:path';

const EX = 'tools/extracted';
const SRC = 'site/src';
const ORIGIN = 'https://aaronellis.co.network';

const index = JSON.parse(fs.readFileSync(`${EX}/index.json`, 'utf8'));

// Gated pages are handled separately (client-side crypto), so we never write
// their plaintext content into the repo. The old draft vault is excluded too.
const GATED = new Set(['alex-private-song-guide', 'rilda-song-guide']);

function permalinkFromLink(item) {
  if (item.slug === 'home') return '/';
  let p = item.link.replace(ORIGIN, '');
  if (!p.startsWith('/')) p = '/' + p;
  if (!p.endsWith('/')) p += '/';
  return p;
}

function outPathFor(permalink) {
  // "/" -> src/index.html ; "/books/" -> src/books/index.html
  const rel = permalink === '/' ? '' : permalink.replace(/^\/|\/$/g, '');
  return path.join(SRC, rel, 'index.html');
}

let written = 0;
const skipped = [];
const manifest = [];

for (const item of index) {
  if (item.status !== 'publish' && item.status !== 'private') { skipped.push(`${item.slug} (${item.status})`); continue; }
  if (GATED.has(item.slug)) { skipped.push(`${item.slug} (gated)`); continue; }

  const permalink = permalinkFromLink(item);
  const file = `${EX}/rendered/${String(item.id).padStart(4, '0')}-${item.slug}.html`;
  if (!fs.existsSync(file)) { skipped.push(`${item.slug} (no rendered file)`); continue; }
  const content = fs.readFileSync(file, 'utf8').trim();

  const fm = [
    '---',
    'layout: base.njk',
    `title: ${JSON.stringify(item.title)}`,
    `permalink: ${JSON.stringify(permalink)}`,
    `wpId: ${item.id}`,
    '---',
    '',
  ].join('\n');

  const out = outPathFor(permalink);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, fm + content + '\n');
  written++;
  manifest.push({ id: item.id, slug: item.slug, permalink, out: out.replace(SRC + '/', '') });
}

fs.writeFileSync(`${EX}/src-manifest.json`, JSON.stringify(manifest, null, 2));
console.log(`wrote ${written} source pages to ${SRC}/`);
console.log(`skipped (${skipped.length}):`, skipped.join(', '));
