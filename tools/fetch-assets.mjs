// Download every wp-content/uploads asset referenced by the site into
// site/assets/uploads/<same path>, so the static build is self-contained.
// HTTPS only (the deploy environment allows 443). Usage: node tools/fetch-assets.mjs
import fs from 'node:fs';
import path from 'node:path';

const SRC_DIRS = ['tools/extracted/rendered', 'wordpress'];
const ORIGIN = 'https://aaronellis.co.network';
const OUT = 'site/assets/uploads';

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(html|mjs|css)$/.test(e.name)) acc.push(p);
  }
  return acc;
}

const re = /https:\/\/aaronellis\.co\.network\/wp-content\/uploads\/[^"'`)\\\s&]+/g;
const urls = new Set();
for (const dir of SRC_DIRS) {
  if (!fs.existsSync(dir)) continue;
  for (const file of walk(dir)) {
    const txt = fs.readFileSync(file, 'utf8');
    let m; while ((m = re.exec(txt))) {
      const u = m[0].replace(/[?#].*$/, '');
      if (u.endsWith('.mp3')) continue; // large media stays on the host (root-relative)
      urls.add(u);
    }
  }
}
console.log('unique upload URLs:', urls.size);

let ok = 0, skip = 0, fail = 0, bytes = 0;
const list = [...urls];
const CONCURRENCY = 6;
async function worker(queue) {
  while (queue.length) {
    const url = queue.pop();
    const rel = url.replace(`${ORIGIN}/wp-content/uploads/`, '');
    const dest = path.join(OUT, rel);
    if (fs.existsSync(dest)) { skip++; continue; }
    try {
      const r = await fetch(url);
      if (!r.ok) { fail++; console.log('  FAIL', r.status, rel); continue; }
      const buf = Buffer.from(await r.arrayBuffer());
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, buf);
      ok++; bytes += buf.length;
    } catch (e) { fail++; console.log('  ERR', rel, e.message); }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(list)));
console.log(`downloaded ${ok}, skipped ${skip}, failed ${fail}, total ${(bytes / 1e6).toFixed(1)} MB -> ${OUT}/`);
