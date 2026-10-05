(function(){
 'use strict';
 document.addEventListener('click',async function(e){var b=e.target.closest('[data-cabinet]');if(!b)return;e.preventDefault();b.disabled=true;try{var r=await fetch('/api/cabinet-preview/start',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:b.dataset.cabinet})}),j=await r.json();if(!r.ok)throw Error(j.error);location.href=j.url;}catch(err){alert(err.message);b.disabled=false;}});
 fetch('/api/auth/me',{credentials:'same-origin'}).then(r=>r.ok||r.status===409?r.json():null).then(function(me){if(me?.previewUnavailable)me={name:'Кабинет недоступен',preview:{returnTo:'admin-shahmatka.html'}};if(!me?.preview)return;
  var banner=document.createElement('div');banner.className='cabinet-preview';banner.setAttribute('role','status');
  var text=document.createElement('span');text.textContent='Просмотр ЛК: '+me.name+' · изменения отключены';
  var button=document.createElement('button');button.className='msv-btn msv-btn--s msv-btn--secondary';button.textContent='Вернуться в мой кабинет';
  button.onclick=async function(){button.disabled=true;try{var r=await fetch('/api/cabinet-preview/stop',{method:'POST',credentials:'same-origin'});if(!r.ok)throw Error('Не удалось завершить просмотр');location.href=me.preview.returnTo;}catch(e){alert(e.message);button.disabled=false;}};
  banner.append(text,button);document.body.prepend(banner);var css=document.createElement('style');css.textContent='.cabinet-preview{position:sticky;top:0;z-index:10100;padding:12px 20px;display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:center;background:#FFF6DE;color:#34495E;font:14px/1.4 sans-serif;border-bottom:2px solid #CBB6FF}';document.head.append(css);
 }).catch(function(){});
})();
