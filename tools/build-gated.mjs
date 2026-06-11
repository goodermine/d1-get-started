// Build the two private song-guide pages as client-side encrypted gates.
// Reads the (auth-extracted) plaintext, strips wpautop noise, rewrites URLs,
// encrypts the guide body with a fresh strong password (PBKDF2/AES-GCM), and
// writes a static page that decrypts in-browser via assets/gate.js.
// Plaintext is NEVER written into the repo; only ciphertext is embedded.
//
// Usage: node tools/build-gated.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { webcrypto as crypto } from 'node:crypto';

const EX = 'tools/extracted/rendered';
const SRC = 'site/src';

const GUIDES = [
  { id: 263, slug: 'alex-private-song-guide', title: "Alex's Private Song Guide", wrap: 'alex-song-guide', kicker: 'Private Vocal Dashboard' },
  { id: 272, slug: 'rilda-song-guide', title: "Rilda's Private Song Guide", wrap: 'rilda-song-guide', kicker: 'Private Vocal Notebook' },
];

function rewriteUrls(s) {
  s = s.replace(/@import\s+url\(['"]?https:\/\/fonts\.googleapis\.com[^)]*\)\s*;?/g, ''); // fonts now self-hosted
  s = s.replace(/https:\/\/aaronellis\.co\.network\/wp-content\/uploads\/([^"'`)\\\s&]*\.mp3)/g, '/wp-content/uploads/$1');
  s = s.replace(/https:\/\/aaronellis\.co\.network\/wp-content\/uploads\//g, '/assets/uploads/');
  s = s.replace(/https:\/\/aaronellis\.co\.network\//g, '/');
  s = s.replace(/https:\/\/aaronellis\.co\.network\b/g, '');
  return s;
}

// Reuse already-issued passwords (saved outside the repo) so re-running this
// script does not change the passwords already shared with people.
function loadExistingPasswords(pwFile) {
  const map = {};
  if (!fs.existsSync(pwFile)) return map;
  const txt = fs.readFileSync(pwFile, 'utf8');
  const re = /\/([\w-]+)\/\n\s*password:\s*(\S+)/g;
  let m; while ((m = re.exec(txt))) map[m[1]] = m[2];
  return map;
}

const BLOCK = 'main|header|footer|section|article|div|ul|ol|li|h[1-6]|figure|figcaption|nav|table|p';
function cleanWpautop(s) {
  // Remove <p> WordPress inserted directly around block-level elements.
  const open = new RegExp(`<p>\\s*(<(?:${BLOCK})\\b)`, 'g');
  const close = new RegExp(`(</(?:${BLOCK})>)\\s*</p>`, 'g');
  let prev;
  do { prev = s; s = s.replace(open, '$1').replace(close, '$1'); } while (s !== prev);
  return s.replace(/<p>\s*<\/p>/g, '');
}

function genPassword() {
  const alpha = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let out = '';
  for (let i = 0; i < 16; i++) { if (i && i % 4 === 0) out += '-'; out += alpha[bytes[i] % alpha.length]; }
  return out; // e.g. xKt7-9Qma-Vbn3-pR5s  (~92 bits)
}

async function encrypt(text, password, iterations = 250000) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const baseKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), { name: 'PBKDF2' }, false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, baseKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(text));
  const b64 = b => Buffer.from(b).toString('base64');
  return { salt: b64(salt), iv: b64(iv), iterations, payload: b64(cipher) };
}

const GATE_CSS = `
.guide-gate-shell{min-height:70vh;display:grid;place-items:center;padding:clamp(40px,9vw,88px) 18px;background:radial-gradient(circle at 18% 10%,rgba(255,105,68,.15),transparent 22rem),radial-gradient(circle at 82% 0%,rgba(245,191,66,.14),transparent 20rem),linear-gradient(180deg,#05070d,#0b1018 52%,#06080d)}
.guide-gate{width:min(560px,100%);background:linear-gradient(180deg,rgba(11,17,29,.98),rgba(16,24,39,.97));border:1px solid rgba(245,191,66,.18);border-radius:24px;box-shadow:0 28px 80px rgba(0,0,0,.45);padding:clamp(24px,4vw,36px);color:#f6f2ea;font-family:Inter,system-ui,sans-serif}
.guide-gate .eyebrow{color:#f5bf42;font-size:.74rem;font-weight:800;letter-spacing:.22em;text-transform:uppercase;margin:0 0 10px}
.guide-gate h1{font-family:Georgia,serif;font-weight:600;font-size:clamp(1.7rem,4vw,2.4rem);margin:0 0 12px;line-height:1.1}
.guide-gate p{color:#cfd6e6;line-height:1.65;margin:0 0 16px}
.guide-gate .row{display:flex;gap:10px;flex-wrap:wrap}
.guide-gate input{flex:1;min-width:200px;min-height:52px;padding:0 16px;border-radius:14px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#f6f2ea;font-size:1rem}
.guide-gate input:focus{outline:none;border-color:rgba(245,191,66,.5);box-shadow:0 0 0 3px rgba(245,191,66,.14)}
.guide-gate button{min-height:52px;padding:0 24px;border:0;border-radius:14px;background:linear-gradient(180deg,#f5bf42,#d99a22);color:#05070d;font-weight:800;font-size:1rem;cursor:pointer}
.guide-gate button[disabled]{opacity:.7;cursor:wait}
.guide-gate .gate-error{display:none;color:#ffd5cf;font-weight:700;margin:14px 0 0}
.guide-gate .hint{font-size:.9rem;color:#9aa6bd;margin-top:14px}
`;

const pwFile = path.join(os.homedir(), 'song-guide-passwords.txt');
const existing = loadExistingPasswords(pwFile);
const passwords = [];
for (const g of GUIDES) {
  const raw = fs.readFileSync(path.join(EX, `${String(g.id).padStart(4, '0')}-${g.slug}.html`), 'utf8');
  const lastStyle = raw.lastIndexOf('</style>');
  let styleBlock = raw.slice(0, lastStyle + 8);
  let body = raw.slice(lastStyle + 8);

  // Re-scope theme body rules onto the content wrapper so styling survives.
  const bodyRule = new RegExp(`body\\.page-id-${g.id}(?:\\.[\\w-]+)*`, 'g');
  styleBlock = styleBlock.replace(bodyRule, `.${g.wrap}`);
  styleBlock = rewriteUrls(styleBlock);

  // Clean content; avoid a nested <main> inside the layout's <main>.
  body = cleanWpautop(body);
  body = body.replace(new RegExp(`<main class="${g.wrap}"`, 'g'), `<div class="${g.wrap}"`).replace(/<\/main>/g, '</div>');
  body = rewriteUrls(body).trim();

  const password = existing[g.slug] || genPassword();
  const enc = await encrypt(body, password);
  passwords.push({ slug: g.slug, title: g.title, password });

  const fm = ['---', 'layout: base.njk', `title: ${JSON.stringify(g.title)}`,
    `permalink: ${JSON.stringify('/' + g.slug + '/')}`, 'noindex: true', '---', ''].join('\n');

  const page = `${styleBlock}
<style id="guide-gate-css">${GATE_CSS}</style>
<div class="guide-gate-shell">
  <div class="guide-gate" data-gate data-mode="inject" data-target="#guide-content"
       data-salt="${enc.salt}" data-iv="${enc.iv}" data-iterations="${enc.iterations}"
       data-payload="${enc.payload}">
    <p class="eyebrow">${g.kicker}</p>
    <h1>${g.title}</h1>
    <p>This page is private. Enter the password Aaron shared with you to open your guide. The password is checked in your browser — nothing is sent anywhere, and no account is needed.</p>
    <div class="row">
      <input data-gate-input type="password" inputmode="text" autocomplete="off" spellcheck="false" placeholder="Enter your password" aria-label="Password" />
      <button data-gate-button type="button">Open guide</button>
    </div>
    <p data-gate-error class="gate-error">That password doesn't look right. Please check it and try again, exactly as Aaron sent it (the dashes matter).</p>
    <p class="hint">Tip: you can paste it — spaces at the start or end are ignored.</p>
  </div>
</div>
<div id="guide-content" data-gate-content hidden></div>
<script src="/assets/gate.js"></script>
`;

  const out = path.join(SRC, g.slug, 'index.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, fm + page);
  console.log(`built /${g.slug}/  (payload ${(enc.payload.length / 1024).toFixed(1)} KB)`);
}

// Save the passwords OUTSIDE the repo so they're never committed.
fs.writeFileSync(pwFile, passwords.map(p => `${p.title}\n  /${p.slug}/\n  password: ${p.password}\n`).join('\n'));
console.log('\n=== PASSWORDS (saved to ' + pwFile + ', NOT committed) ===');
for (const p of passwords) console.log(`  ${p.slug}: ${p.password}`);
