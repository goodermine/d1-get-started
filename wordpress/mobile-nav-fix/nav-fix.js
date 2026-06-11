/* ae-nav-resize-fix — Hello Elementor 3.4.9 closes the mobile dropdown on any
   window resize (incl. mobile URL-bar collapse when you start scrolling), by
   stripping .elementor-active from the toggle holder WITHOUT resetting
   aria-expanded/aria-hidden. Result: menu vanishes mid-scroll, X stays stuck.
   Shim: while the dropdown is genuinely open (aria-hidden="false"), veto that
   class removal; keep the toggle icon state in sync. Real closes (which set
   aria-hidden="true") pass through untouched. */
(function(){
  function init(){
    var holder=document.querySelector('.site-header .site-navigation-toggle-holder');
    var drop=document.querySelector('.site-header .site-navigation-dropdown');
    var toggle=document.querySelector('.site-header .site-navigation-toggle');
    if(!holder||!drop||!toggle){return;}
    if(holder.dataset.aeNavShim){return;}
    holder.dataset.aeNavShim='1';
    var syncing=false;
    function sync(){
      if(syncing){return;}
      syncing=true;
      var open=drop.getAttribute('aria-hidden')==='false';
      var active=holder.classList.contains('elementor-active');
      if(open&&!active){holder.classList.add('elementor-active');}
      if(!open&&active){holder.classList.remove('elementor-active');}
      toggle.setAttribute('aria-expanded',open?'true':'false');
      syncing=false;
    }
    var mo=new MutationObserver(sync);
    mo.observe(holder,{attributes:true,attributeFilter:['class']});
    mo.observe(drop,{attributes:true,attributeFilter:['aria-hidden']});
  }
  if(document.readyState==='complete'){init();}
  else{window.addEventListener('load',init);}
})();
