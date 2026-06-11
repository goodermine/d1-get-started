// Read-only inventory of the live WordPress site via REST.
// Pulls every page + post (edit context for raw+rendered) and the menus,
// writes a compact summary to tools/inventory.json for planning the static build.
// Usage: node tools/inventory.mjs
import fs from 'node:fs';

// Credentials come from the environment, e.g.
//   WP_AUTH="user:application password" node tools/inventory.mjs
const WP_AUTH = process.env.WP_AUTH;
if (!WP_AUTH) { console.error('Set WP_AUTH="user:app password" in the environment.'); process.exit(1); }
const AUTH = 'Basic ' + Buffer.from(WP_AUTH).toString('base64');
const BASE = 'https://aaronellis.co.network/wp-json/wp/v2';
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
    const url = `${BASE}/${type}?per_page=100&page=${page}&status=publish,private,draft,pending&context=edit&_fields=id,slug,title,status,parent,link,template,type,date,modified`;
    const { json, headers } = await api(url);
    totalPages = parseInt(headers.get('x-wp-totalpages') || '1', 10);
    out.push(...json);
    page++;
  } while (page <= totalPages);
  return out;
}

async function tryMenus() {
  const result = {};
  for (const ep of ['menus', 'menu-items']) {
    try {
      const r = await fetch(`${BASE}/${ep}?per_page=100&context=edit`, { headers: { Authorization: AUTH } });
      result[ep] = { status: r.status, data: r.ok ? await r.json() : null };
    } catch (e) { result[ep] = { error: e.message }; }
  }
  return result;
}

const pages = await getAll('pages');
const posts = await getAll('posts');
const menus = await tryMenus();

const norm = x => ({
  id: x.id, slug: x.slug, title: x.title?.rendered || x.title?.raw || '',
  status: x.status, parent: x.parent || 0, template: x.template || '',
  link: x.link, type: x.type, modified: x.modified,
});

const summary = {
  generatedAt: new Date().toISOString(),
  counts: { pages: pages.length, posts: posts.length },
  pages: pages.map(norm).sort((a, b) => (a.parent - b.parent) || a.slug.localeCompare(b.slug)),
  posts: posts.map(norm),
  menus: {
    'menus.status': menus.menus?.status,
    'menu-items.status': menus['menu-items']?.status,
    menuItemCount: Array.isArray(menus['menu-items']?.data) ? menus['menu-items'].data.length : null,
  },
};

fs.writeFileSync('tools/inventory.json', JSON.stringify(summary, null, 2));
fs.writeFileSync('tools/menus.raw.json', JSON.stringify(menus, null, 2));

// Console digest
console.log('\n\n=== INVENTORY ===');
console.log('pages:', pages.length, '| posts:', posts.length);
console.log('menus endpoint:', summary.menus['menus.status'], '| menu-items:', summary.menus['menu-items.status'], '| items:', summary.menus.menuItemCount);
const byStatus = {};
for (const p of pages) byStatus[p.status] = (byStatus[p.status] || 0) + 1;
console.log('page statuses:', JSON.stringify(byStatus));
const parents = new Map(pages.map(p => [p.id, p.slug]));
console.log('\n--- top-level pages ---');
for (const p of summary.pages.filter(p => !p.parent)) console.log(`  ${p.status.padEnd(8)} /${p.slug}/  (#${p.id}) ${p.template ? '['+p.template+']' : ''}`);
console.log('\n--- child pages (parent → slug) ---');
for (const p of summary.pages.filter(p => p.parent)) console.log(`  /${parents.get(p.parent) || p.parent}/${p.slug}/  (#${p.id}, ${p.status})`);
console.log('\n--- posts ---');
for (const p of summary.posts) console.log(`  ${p.status.padEnd(8)} /${p.slug}/  (#${p.id})`);
console.log('\nwrote tools/inventory.json + tools/menus.raw.json');
