// Appends/replaces an ae-nav-resize-fix block (CSS + base64 JS shim) on every
// page/post that renders the standard theme header. Idempotent.
import fs from 'node:fs';
const AUTH='Basic '+Buffer.from('azonixx:621z hCfR nhkU At1G Dx4E tEaL').toString('base64');
const BASE='https://aaronellis.co.network/wp-json/wp/v2';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function api(method,url,body){
  for(let i=0;i<6;i++){
    try{
      const r=await fetch(url,{method,headers:{Authorization:AUTH,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
      const t=await r.text();
      if(r.ok) return JSON.parse(t);
      process.stdout.write(`[${r.status}t${i+1}]`);
    }catch(e){ process.stdout.write('[e]'); }
    await sleep([5000,10000,20000,30000,45000,60000][i]);
  }
  throw new Error('api fail '+url);
}
// CSS: dropdown visibility follows aria-hidden ONLY (the buggy close path never
// touches aria-hidden, so a URL-bar resize can no longer hide an open menu).
const css='@media (max-width:1024px){body .site-header .site-navigation-dropdown[aria-hidden="true"]{display:none!important}body .site-header .site-navigation-dropdown:not([aria-hidden="true"]){display:block!important;opacity:1!important;visibility:visible!important;transform:none!important;pointer-events:auto!important}}';
const js=fs.readFileSync(new URL('./nav-fix.js',import.meta.url),'utf8');
const b64=Buffer.from(js,'utf8').toString('base64');
const block=`<!-- wp:html --><style id="ae-nav-resize-fix-css">${css}</style><script id="ae-nav-resize-fix-js" src="data:text/javascript;base64,${b64}"></script><!-- /wp:html -->`;
function inject(raw){
  raw=raw.replace(/<!-- wp:html --><style id="ae-nav-resize-fix-css">[\s\S]*?<!-- \/wp:html -->/g,'');
  return raw.trimEnd()+'\n'+block;
}
// targets: main pages + all children of 355/356 + posts. Skip canvas-template
// pages (no theme header), 201 (own nav), 562 (header hidden).
const mainPages=[453,15,448,232,194,189,355,356,327];
const kids=[];
for(const parent of [355,356]){
  const c=await api('GET',`${BASE}/pages?parent=${parent}&per_page=50&status=publish&context=edit&_fields=id,slug`);
  for(const k of c) kids.push(k.id);
}
const posts=await api('GET',`${BASE}/posts?per_page=50&status=publish&context=edit&_fields=id,slug`);
console.log('pages:',mainPages.length,'| children:',kids.length,'| posts:',posts.length);
for(const id of [...mainPages,...kids]){
  const j=await api('GET',`${BASE}/pages/${id}?context=edit`);
  const upd=await api('POST',`${BASE}/pages/${id}`,{content:inject(j.content.raw)});
  process.stdout.write(`p${id}✓ `);await sleep(1500);
}
for(const p of posts){
  const j=await api('GET',`${BASE}/posts/${p.id}?context=edit`);
  const upd=await api('POST',`${BASE}/posts/${p.id}`,{content:inject(j.content.raw)});
  process.stdout.write(`post${p.id}✓ `);await sleep(1500);
}
console.log('\ndone');
