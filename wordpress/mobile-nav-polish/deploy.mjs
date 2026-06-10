// Appends/replaces an ae-mobile-nav-polish style block on each target page.
// Idempotent: strips any previous ae-mobile-nav-polish block before appending.
import fs from 'node:fs';
const AUTH='Basic '+Buffer.from('azonixx:621z hCfR nhkU At1G Dx4E tEaL').toString('base64');
const BASE='https://aaronellis.co.network/wp-json/wp/v2';
const PAGES=[453,15,448,232,194,189,355,356,327]; // all handoff pages except 201 (own nav strip) and 562 (header hidden)
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function api(method,url,body){
  for(let i=0;i<6;i++){
    try{
      const r=await fetch(url,{method,headers:{Authorization:AUTH,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
      const t=await r.text();
      if(r.ok) return JSON.parse(t);
      process.stdout.write(`[${r.status}t${i+1}]`);
    }catch(e){ process.stdout.write('[e]'); }
    await sleep([2000,4000,8000,12000,16000,16000][i]);
  }
  throw new Error('api fail '+url);
}
const tpl=fs.readFileSync(new URL('./polish.css',import.meta.url),'utf8')
  .replace(/\/\*[\s\S]*?\*\//g,'').replace(/\s*([{}:;,])\s*/g,'$1').replace(/;}/g,'}').replace(/\s+/g,' ').trim();
const backups={};
for(const id of PAGES){
  const j=await api('GET',`${BASE}/pages/${id}?context=edit`);
  let raw=j.content.raw;
  backups[id]=raw;
  // strip any previous polish block (idempotent re-runs)
  raw=raw.replace(/<!-- wp:html --><style id="ae-mobile-nav-polish-\d+">[\s\S]*?<\/style><!-- \/wp:html -->/g,'');
  raw=raw.replace(/<style id="ae-mobile-nav-polish-\d+">[\s\S]*?<\/style>/g,'');
  const css=tpl.replace(/page-id-PID/g,'page-id-'+id);
  const block=`<!-- wp:html --><style id="ae-mobile-nav-polish-${id}">${css}</style><!-- /wp:html -->`;
  const upd=await api('POST',`${BASE}/pages/${id}`,{content:raw.trimEnd()+'\n'+block});
  console.log(`page ${id} (${upd.slug}) updated, modified ${upd.modified}`);
}
fs.writeFileSync(new URL('./backup-before-polish.json',import.meta.url),JSON.stringify(backups));
console.log('backups saved for',Object.keys(backups).join(','));
