(function(){
'use strict';
var keys=['chart','residents','tickets','charges','payroll'],labels=['Шахматка','Резиденты','Заявки','Начисления','Зарплаты'];
var pen='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m14.8 4.2 1-1a2 2 0 0 1 2.8 0l2.2 2.2a2 2 0 0 1 0 2.8L9.4 19.6a2 2 0 0 1-.9.5l-4.2 1a.8.8 0 0 1-1-1l1-4.2a2 2 0 0 1 .5-.9Z"/><path d="m14 5 5 5M5 15l4 4"/>';
window.MSV_STAFF_ACCESS=function(root,people,ctx){
 if(!ctx.live||!ctx.me||!ctx.me.canEditSite)return;
 root.querySelectorAll('[data-staff-access]').forEach(function(host){
  var person=people.find(function(p){return String(p.id)===host.dataset.staffAccess;});if(!person)return;
  var base=Object.assign({chartEdit:person.role==='moderator'||person.role==='admin'},person.sectionAccess),draft=Object.assign({},base),busy=false,status='';
  var locked=person.role==='admin'||person.canEditSite||String(person.id)===String(ctx.me.id);
  function dirty(){return keys.concat('chartEdit').some(function(k){return !!base[k]!==!!draft[k];});}
  function render(){
   host.innerHTML='<h3 class="msv-sub">Доступ к разделам</h3>'+(locked?'<span class="perm__item perm__item--on">Тотал</span><p class="msv-note">Полные права администратора здесь не изменяются.</p>':'<div class="staff-access__pills">'+keys.map(function(k,i){var on=!!draft[k],cls='perm__item'+(on?' perm__item--on':'');var button='<button type="button" class="'+cls+'" data-access-key="'+k+'" aria-pressed="'+on+'"'+(busy?' disabled':'')+'>'+labels[i]+'</button>';if(k!=='chart')return button;var write=person.role==='moderator'&&!!draft.chartEdit,title=write?'Редактирование шахматки':'Только просмотр шахматки',icon=pen+(write?'':'<path d="M3 3l18 18"/>')+'</svg>';return '<span class="staff-access__chart '+cls+'">'+button+(person.role==='moderator'?'<button type="button" data-access-mode aria-label="'+title+' — переключить" title="'+title+'"'+(!on||busy?' disabled':'')+'>'+icon+'</button>':'<span title="'+title+'">'+icon+'</span>')+'</span>';}).join('')+'</div><div class="staff-access__actions"><button type="button" class="msv-btn msv-btn--s msv-btn--secondary" data-access-cancel'+(busy?' disabled':'')+'>Отмена</button><button type="button" class="msv-btn msv-btn--s msv-btn--primary" data-access-save'+(!dirty()||busy?' disabled':'')+'>Сохранить</button></div>')+'<p class="msv-note" role="status"></p>';
   host.querySelector('[role=status]').textContent=status;
  }
  host.onclick=async function(e){var b=e.target.closest('button');if(!b||b.disabled||busy||locked)return;
   if(b.hasAttribute('data-access-key')){draft[b.dataset.accessKey]=!draft[b.dataset.accessKey];status='';render();return;}
   if(b.hasAttribute('data-access-mode')){draft.chartEdit=!draft.chartEdit;status='';render();return;}
   if(b.hasAttribute('data-access-cancel')){draft=Object.assign({},base);status='';render();return;}
   if(!b.hasAttribute('data-access-save')||!dirty())return;
   var payload={};keys.concat('chartEdit').forEach(function(k){payload[k]=!!draft[k];});busy=true;status='Сохранение…';render();
   try{var r=await ctx.api('PUT','/api/staff/'+encodeURIComponent(person.id)+'/sections',payload);if(r.status!==200)throw Error(r.body&&r.body.error||'Не удалось сохранить права');base=Object.assign({},payload);person.sectionAccess=Object.assign({},payload);status='Права доступа сохранены.';}catch(error){status=error.message||'Сервер не отвечает';}finally{busy=false;render();}
  };render();
 });
};
})();
