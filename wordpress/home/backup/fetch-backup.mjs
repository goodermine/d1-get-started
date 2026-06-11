import fs from 'node:fs';
const AUTH='Basic '+Buffer.from('azonixx:621z hCfR nhkU At1G Dx4E tEaL').toString('base64');
const r=await fetch('https://aaronellis.co.network/wp-json/wp/v2/pages/453?context=edit',{headers:{Authorization:AUTH}});
const p=JSON.parse(await r.text());
fs.writeFileSync('wordpress/home/backup/page-453.original.html',p.content.raw);
fs.writeFileSync('wordpress/home/backup/page-453.meta.json',JSON.stringify({id:p.id,slug:p.slug,title:p.title.raw,status:p.status,template:p.template,modified:p.modified},null,2));
console.log('backed up',p.content.raw.length,'bytes | modified',p.modified);
