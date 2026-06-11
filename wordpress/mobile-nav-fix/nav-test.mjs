import puppeteer from 'puppeteer';
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox','--disable-setuid-sandbox','--ignore-certificate-errors']});
const pg=await b.newPage();
await pg.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
await pg.goto('https://aaronellis.co.network/?nav='+Date.now(),{waitUntil:'networkidle2',timeout:45000});
await new Promise(r=>setTimeout(r,2000));
const state=()=>pg.evaluate(()=>{
  const d=document.querySelector('.site-navigation-dropdown');
  const t=document.querySelector('.site-navigation-toggle');
  const cs=getComputedStyle(d);
  return {ariaHidden:d.getAttribute('aria-hidden'),display:cs.display,visibility:cs.visibility,opacity:cs.opacity,
          expanded:t.getAttribute('aria-expanded'),holderActive:document.querySelector('.site-navigation-toggle-holder').classList.contains('elementor-active'),
          shim:document.querySelector('.site-navigation-toggle-holder').dataset.aeNavShim||'none'};
});
console.log('0 initial:',JSON.stringify(await state()));
// 1) open the menu
await pg.tap('.site-navigation-toggle');
await new Promise(r=>setTimeout(r,500));
console.log('1 after open tap:',JSON.stringify(await state()));
// 2) simulate mobile URL-bar collapse: viewport height change fires window resize
await pg.setViewport({width:390,height:900,deviceScaleFactor:2,isMobile:true,hasTouch:true});
await new Promise(r=>setTimeout(r,600));
console.log('2 after resize (scroll start):',JSON.stringify(await state()));
// 3) also fire a plain resize event for good measure
await pg.evaluate(()=>window.dispatchEvent(new Event('resize')));
await new Promise(r=>setTimeout(r,400));
console.log('3 after extra resize event:',JSON.stringify(await state()));
await pg.screenshot({path:'/tmp/shots/nav-open-after-resize.png'});
// 4) single tap on X should close
await pg.tap('.site-navigation-toggle');
await new Promise(r=>setTimeout(r,500));
console.log('4 after close tap:',JSON.stringify(await state()));
await b.close();
