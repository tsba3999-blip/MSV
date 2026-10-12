/* Shared optical sizes: measured artwork, rather than the SVG canvas. */
(function(){
  'use strict';
  var selector='svg.tile__icon,.row__icon>svg,.side__link>svg,.side__exit>svg,.tab>svg,.msv-icon-muted>svg,.face__delete>svg,.profile-settings>svg,.edit-bar__pen>svg';
  var queued=false;
  function normalize(svg){
    if(svg.querySelector(':scope > g[data-msv-icon]')||!svg.getBoundingClientRect().width)return;
    var bento=svg.matches('.tile__icon'), size=bento?48:svg.closest('.row__icon')?24:20;
    var height=bento?36:size===24?18:16, weight=bento?2.5:1.5;
    var eagle=!!svg.querySelector('mask image');
    var box=svg.getBBox();if(!box.height)return;
    if(eagle)box={x:0,y:0,width:24,height:23.5};
    var scale=(height-(eagle?0:weight))/box.height, viewport=size/scale;
    var canvasWidth=size, viewportWidth=canvasWidth/scale;
    svg.setAttribute('viewBox',[(box.x+box.width/2-viewportWidth/2),(box.y+box.height/2-viewport/2),viewportWidth,viewport].join(' '));
    svg.style.width=canvasWidth+'px';svg.style.overflow='visible';svg.style.height=size+'px';svg.style.flexShrink='0';
    svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');
    var group=document.createElementNS('http://www.w3.org/2000/svg','g');group.dataset.msvIcon='true';
    while(svg.firstChild)group.appendChild(svg.firstChild);svg.appendChild(group);
    if(!eagle)group.querySelectorAll('path,rect,circle,ellipse,line,polyline,polygon').forEach(function(shape){
      if(shape.closest('defs,mask,clipPath'))return;
      if(shape.getAttribute('stroke')==='none')return;
      shape.style.strokeWidth=weight+'px';shape.style.strokeLinecap='round';shape.style.strokeLinejoin='round';shape.setAttribute('vector-effect','non-scaling-stroke');
    });
  }
  function run(){queued=false;document.querySelectorAll(selector).forEach(normalize);}
  function schedule(){if(!queued){queued=true;requestAnimationFrame(run);}}
  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
  document.addEventListener('msv:menu-ready',schedule);window.addEventListener('resize',schedule);window.addEventListener('load',schedule);schedule();
})();
