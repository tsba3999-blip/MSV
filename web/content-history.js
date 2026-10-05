(function(){
 'use strict';
 var form=document.querySelector('form'),box=document.getElementById('history'),status=document.getElementById('status');
 function plain(html){var t=document.createElement('template');t.innerHTML=html||'';return t.content.textContent||'Исходный текст страницы';}
 async function load(){
  status.textContent='Загрузка…';box.replaceChildren();
  try{var r=await fetch('/api/content/history?'+new URLSearchParams(new FormData(form)),{credentials:'same-origin'}),list=await r.json();if(!r.ok)throw Error(list.error);
   status.textContent=list.length?'Найдено: '+list.length:'Правок за выбранный период нет.';
   list.forEach(function(h){var section=document.createElement('section');section.style.cssText='padding:20px 0;border-bottom:1px solid #EAE4DA';
    var title=document.createElement('h2');title.className='msv-body';title.textContent=new Date(h.created_at).toLocaleString('ru-RU')+' · '+h.page+' · '+(h.author||'');section.append(title);
    ['before','after'].forEach(function(v){var p=document.createElement('p');p.textContent=(v==='before'?'До: ':'После: ')+plain(h[v+'_html']);section.append(p);
     var b=document.createElement('button');b.className='msv-btn msv-btn--s msv-btn--secondary';b.textContent=v==='before'?'Вернуть текст до правки':'Вернуть эту редакцию';
     b.onclick=async function(){if(!confirm('Заменить только этот элемент на выбранную редакцию?'))return;b.disabled=true;try{var r=await fetch('/api/content/history/'+h.id+'/restore',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:v})}),j=await r.json();if(!r.ok)throw Error(j.error);await load();}catch(e){status.textContent=e.message;b.disabled=false;}};section.append(b);
    });box.append(section);
   });
  }catch(e){status.textContent=e.message;}
 }
 form.onsubmit=function(e){e.preventDefault();load();};load();
})();
