import fs from 'node:fs';
const AUTH='Basic '+Buffer.from('azonixx:621z hCfR nhkU At1G Dx4E tEaL').toString('base64');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function api(method,url,body){for(let i=0;i<6;i++){try{const r=await fetch(url,{method,headers:{Authorization:AUTH,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const t=await r.text();if(r.ok)return JSON.parse(t);process.stdout.write(`[${r.status} t${i+1}]`);}catch(e){process.stdout.write(`[e ${e.message}]`);}await sleep([2000,4000,8000,12000,16000,16000][i]);}throw new Error('fail '+url);}
// ordered: !important variants BEFORE bare variants (bare is a prefix of important)
const reps=[
 ['text-shadow: 2px 2px 0 #050807, 4px 4px 0 #7d2417 !important','text-shadow: 0 2px 24px rgba(0,0,0,0.45) !important'],
 ['text-shadow: 2px 2px 0 #050807, 4px 4px 0 #7d2417','text-shadow: 0 2px 24px rgba(0,0,0,0.45)'],
 ['box-shadow: 0 4px 0 #7d2417 !important','box-shadow: 0 10px 24px rgba(217,154,34,0.3) !important'],
 ['box-shadow: 0 5px 0 #7d2417 !important','box-shadow: 0 12px 28px rgba(217,154,34,0.32) !important'],
 ['box-shadow: 0 5px 0 #7d2417','box-shadow: 0 12px 28px rgba(217,154,34,0.32)'],
];
const targets=[[189,'resume'],[194,'real-estate-buddy'],[232,'articles'],[327,'private-pages']];
for(const [id,slug] of targets){
  let s=fs.readFileSync(`wordpress/page-polish/backup/page-${id}.original.html`,'utf8');
  let applied=[];
  for(const [a,b] of reps){ if(s.includes(a)){const cnt=s.split(a).length-1;s=s.split(a).join(b);applied.push(`${a.slice(0,28)}…×${cnt}`);} }
  // flag any leftover hard-offset red (var-based) we may have missed
  const leftover=(s.match(/0 \d+px 0 (#7d2417|var\(--ae-red-shadow\))/gi)||[]);
  fs.writeFileSync(`wordpress/page-polish/page-${id}.html`,s);
  const upd=await api('POST',`https://aaronellis.co.network/wp-json/wp/v2/pages/${id}`,{content:s});
  console.log(`#${id} /${slug}/ applied=[${applied.join(', ')}] leftoverHardRed=${leftover.length} | modified ${upd.modified}`);
}
