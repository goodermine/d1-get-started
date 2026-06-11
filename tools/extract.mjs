// Read-only: dump rendered + raw content for every page/post into tools/extracted/.
// Stage 1 of the static migration — pure fetch + save, no transformation yet.
// Usage: node tools/extract.mjs
import fs from 'node:fs';

// Credentials come from the environment, e.g.
//   WP_AUTH="user:application password" node tools/extract.mjs
const WP_AUTH = process.env.WP_AUTH;
if (!WP_AUTH) { console.error('Set WP_AUTH="user:app password" in the environment.'); process.exit(1); }
const AUTH = 'Basic ' + Buffer.from(WP_AUTH).toString('base64');
const BASE = 'https://aaronellis.co.network/wp-json/wp/v2';
const OUT = 'tools/extracted';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function api(url) {
  for (let i = 0; i < 5; i++) {
    try {
      const r = await fetch(url, { headers: { Authorization: AUTH } });
      if (r.ok) return { json: await r.json(), headers: r.headers };
      process.stdout.write(`[${r.status} t${i + 1}]`);
    } catch (e) { process.stdout.write(`[e ${e.message}]`); }
    await sleep([1500, 3000, 6000, 10000][i] || 10000);
  }
  throw new Error('api failed: ' + url);
}

async function getAll(type) {
  const out = [];
  let page = 1, totalPages = 1;
  do {
    const url = `${BASE}/${type}?per_page=100&page=${page}&status=publish,private&context=edit`
      + `&_fields=id,slug,title,status,parent,link,template,type,date,modified,content,excerpt`;
    const { json, headers } = await api(url);
    totalPages = parseInt(headers.get('x-wp-totalpages') || '1', 10);
    out.push(...json);
    page++;
  } while (page <= totalPages);
  return out;
}

fs.mkdirSync(`${OUT}/raw`, { recursive: true });
fs.mkdirSync(`${OUT}/rendered`, { recursive: true });

const pages = await getAll('pages');
const posts = await getAll('posts');
const all = [...pages, ...posts];

const index = [];
for (const p of all) {
  const slug = p.slug || `id-${p.id}`;
  const base = `${String(p.id).padStart(4, '0')}-${slug}`;
  const rendered = p.content?.rendered || '';
  const raw = p.content?.raw || '';
  fs.writeFileSync(`${OUT}/rendered/${base}.html`, rendered);
  fs.writeFileSync(`${OUT}/raw/${base}.html`, raw);
  index.push({
    id: p.id, slug, type: p.type, status: p.status, parent: p.parent || 0,
    title: p.title?.rendered || p.title?.raw || '', link: p.link, template: p.template || '',
    renderedBytes: rendered.length, rawBytes: raw.length,
    handAuthored: /class="ae-|magnetic-book-page|class="xb-|ae-home-hub/.test(rawBytes_str(raw, rendered)),
  });
}
function rawBytes_str(raw, rendered) { return raw + '\n' + rendered; }

fs.writeFileSync(`${OUT}/index.json`, JSON.stringify(index, null, 2));
console.log(`\nwrote ${all.length} items to ${OUT}/{raw,rendered}/`);
console.log('hand-authored (detected):', index.filter(x => x.handAuthored).map(x => x.slug).join(', '));
