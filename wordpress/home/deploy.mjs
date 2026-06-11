import fs from 'node:fs';
const AUTH='Basic '+Buffer.from('azonixx:621z hCfR nhkU At1G Dx4E tEaL').toString('base64');
const BASE='https://aaronellis.co.network/wp-json/wp/v2';
const ID=453;
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
const content=fs.readFileSync('wordpress/home/home.html','utf8');
console.log('payload bytes',content.length,'| no && in payload:',!/&&/.test(content));
const upd=await api('POST',`${BASE}/pages/${ID}`,{content});
console.log('UPDATED id',upd.id,'| status',upd.status,'| link',upd.link,'| modified',upd.modified);
