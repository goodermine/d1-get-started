import fs from 'node:fs';
import { buildPayload } from './build-payload.mjs';
const AUTH='Basic '+Buffer.from('azonixx:621z hCfR nhkU At1G Dx4E tEaL').toString('base64');
const BASE='https://aaronellis.co.network/wp-json/wp/v2';
const SLUG='free-audio';
const TITLE='Free Hypnosis Audio — Magnetic Personal Power';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function api(method,url,body){
  for(let i=0;i<6;i++){
    try{
      const r=await fetch(url,{method,headers:{Authorization:AUTH,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
      const t=await r.text();
      if(r.ok) return JSON.parse(t);
      process.stdout.write(`[${method} ${r.status} t${i+1}]`);
    }catch(e){ process.stdout.write(`[e ${e.message}]`); }
    await sleep([2000,4000,8000,12000,16000,16000][i]);
  }
  throw new Error('api failed: '+method+' '+url);
}
// 1) find or create
let id;
const existing=await api('GET',`${BASE}/pages?slug=${SLUG}&status=publish,draft,pending,private&context=edit`);
if(Array.isArray(existing)&&existing.length){ id=existing[0].id; console.log('\nfound existing page id',id); }
else{
  const created=await api('POST',`${BASE}/pages`,{title:TITLE,slug:SLUG,status:'publish',content:'<!-- building -->',comment_status:'closed',ping_status:'closed'});
  id=created.id; console.log('\ncreated page id',id);
}
// 2) build + 3) update
const { out, mainCode }=buildPayload(id);
fs.writeFileSync('/tmp/mpp-script-check.js',mainCode);
console.log('payload bytes',out.length,'| no && in payload:',!/&&/.test(out));
const upd=await api('POST',`${BASE}/pages/${id}`,{content:out,status:'publish',title:TITLE,slug:SLUG});
console.log('UPDATED id',upd.id,'| status',upd.status,'| link',upd.link,'| modified',upd.modified);
fs.writeFileSync('wordpress/free-audio/.page-id',String(id));
