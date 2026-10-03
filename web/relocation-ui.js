(function(global){
  'use strict';
  function api(url,body){return fetch(url,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(function(r){return r.json().then(function(j){if(!r.ok)throw Error(j.error||'Не удалось выполнить переселение');return j;});});}
  global.MSVRelocate={open:function(id,bedId,since){
    var dialog=document.createElement('dialog');
    dialog.style.cssText='width:min(700px,94vw);max-height:90svh;overflow:auto;border:0;border-radius:20px;padding:24px;color:#34495E;background:white';
    dialog.innerHTML='<h2>Подтвердить переселение</h2><label>Дата переезда <input type="date" required></label><p>С указанной даты действует цена нового места. Предыдущее проживание и внесённые платежи сохраняются.</p><div data-summary></div><p role="alert" data-error></p><div style="display:flex;gap:12px;margin-top:16px"><button type="button" class="msv-btn msv-btn--tertiary" data-cancel>Отмена</button><button type="button" class="msv-btn msv-btn--primary" data-confirm disabled>Подтвердить</button></div>';
    var date=dialog.querySelector('input'),summary=dialog.querySelector('[data-summary]'),error=dialog.querySelector('[data-error]'),ok=dialog.querySelector('[data-confirm]');
    var quote=null,version=0,busy=false;
    date.value=since;document.body.appendChild(dialog);dialog.showModal();
    function preview(){
      var current=++version;quote=null;ok.disabled=true;error.textContent='';summary.textContent='Проверяем место и рассчитываем стоимость…';
      api('/api/bookings/'+encodeURIComponent(id)+'/relocation/preview',{bedId:bedId,since:date.value}).then(function(q){
        if(current!==version||!dialog.isConnected)return;quote=q;summary.replaceChildren();
        var person=document.createElement('p');person.textContent=(q.resident||'')+': '+(q.oldPlace||'')+' → '+(q.newPlace||'');summary.appendChild(person);
        ok.disabled=false;
      }).catch(function(e){if(current===version){summary.textContent='';error.textContent=e.message;}});
    }
    date.addEventListener('change',preview);
    dialog.querySelector('[data-cancel]').onclick=function(){if(!busy)dialog.close();};
    dialog.addEventListener('cancel',function(e){if(busy)e.preventDefault();});
    dialog.addEventListener('close',function(){version++;dialog.remove();});
    ok.onclick=function(){if(!quote||busy)return;busy=true;ok.disabled=true;date.disabled=true;error.textContent='';
      api('/api/bookings/'+encodeURIComponent(id)+'/relocation',{bedId:bedId,since:quote.since,token:quote.token}).then(function(){location.reload();}).catch(function(e){busy=false;date.disabled=false;quote=null;error.textContent=e.message+' Измените дату или откройте окно заново для повторной проверки.';});
    };preview();
  }};
})(window);
