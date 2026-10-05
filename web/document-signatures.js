(function(){
 'use strict';var kind=(location.pathname.match(/doc-(contract|rules|consent)\.html/)||[])[1];if(!kind)return;
 if(new URLSearchParams(location.search).has('public'))return;
 fetch('/api/me/docs',{credentials:'same-origin'}).then(function(r){return r.ok?r.json():null;}).then(function(d){
  if(!d)return;var signatures=(d.signatures||[]).filter(function(s){return s.kind===kind;});if(!signatures.length)return;
  var old=document.getElementById('sign');if(old)old.hidden=true;
  var box=document.createElement('section');box.setAttribute('data-no-edit','');box.style.cssText='margin:24px 0;padding-top:20px;border-top:1px solid #EAE4DA';var h=document.createElement('h2');h.className='msv-sub';h.textContent='Мною документ подписан:';box.append(h);
  signatures.forEach(function(s){var p=document.createElement('p'),date=new Date(s.at);p.textContent=s.exact?date.toLocaleString('ru-RU',{timeZone:'Europe/Moscow'})+' (Москва)':date.toLocaleDateString('ru-RU',{timeZone:'Europe/Moscow'})+' — точное время не сохранилось';
   if(s.versionId){var a=document.createElement('button');a.className='msv-btn msv-btn--s msv-btn--secondary';a.textContent='Подписанная редакция';a.onclick=function(){show(s.versionId);};p.append(' ',a);}else p.append(' · Редакция не сохранена');box.append(p);
  });var doc=document.querySelector('.doc');if(doc)doc.append(box);
 });
 async function show(id){try{var r=await fetch('/api/me/document-versions/'+id,{credentials:'same-origin'}),v=await r.json();if(!r.ok)throw Error(v.error);var dom=new DOMParser().parseFromString(v.html,'text/html');(v.overrides||[]).forEach(function(o){var parts=o.key.split('/'),el=dom.body;if(parts[0]==='doc:0'){el=dom.querySelector('.doc');parts.shift();}parts.forEach(function(part){var x=part.split(':');el=el&&el.children[Number(x[1])];if(el&&el.tagName.toLowerCase()!==x[0])el=null;});if(el)el.innerHTML=o.html;});var content=dom.querySelector('.doc');if(!content)throw Error('Текст редакции отсутствует');content.querySelectorAll('script,#sign').forEach(function(e){e.remove();});
  var dialog=document.createElement('dialog');dialog.style.cssText='width:min(900px,94vw);height:90svh;border:0;border-radius:16px';var close=document.createElement('button');close.textContent='Закрыть';close.className='msv-btn msv-btn--secondary';close.onclick=function(){dialog.close();};var frame=document.createElement('iframe');frame.title='Подписанная редакция документа';frame.setAttribute('sandbox','');frame.style.cssText='width:100%;height:90%;border:0';frame.srcdoc='<meta charset="utf-8"><style>body{font:16px/1.6 sans-serif;color:#34495E;padding:16px}</style>'+content.innerHTML;dialog.append(close,frame);document.body.append(dialog);dialog.addEventListener('close',function(){dialog.remove();});dialog.showModal();
 }catch(e){alert(e.message);}}
})();
