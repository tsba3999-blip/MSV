(function(){
 'use strict';
 async function update(){try{var r=await fetch('/api/vendor-reminders',{credentials:'same-origin',cache:'no-store'});if(!r.ok)return;var rows=await r.json(),count=rows.filter(x=>!x.is_read).length;document.querySelectorAll('a[href="contracts-preview.html"]').forEach(function(a){var badge=a.querySelector('[data-vendor-count]');if(!badge){badge=document.createElement('span');badge.dataset.vendorCount='';badge.style.cssText='margin-left:auto;min-width:22px;padding:2px 6px;border-radius:20px;background:var(--msv-red);color:white;text-align:center;font-size:12px';a.appendChild(badge);}badge.textContent=count;badge.hidden=!count;});}catch(_){}}
 fetch('/api/auth/me',{credentials:'same-origin'}).then(r=>r.ok?r.json():null).then(function(me){if(!me||!['admin','moderator'].includes(me.role))return;update();setInterval(update,60000);window.addEventListener('pageshow',update);});
})();
