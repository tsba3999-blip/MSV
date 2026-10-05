(function () {
  'use strict';
  var groups = ['Шаболовка', 'Варшавка', 'Тверская', 'Общие', 'Не распределено'];
  var data, editing = null, view = 'calendar', design = 'groups', dragged = null, configuring=false;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };
  var money = function (v) { return Number(v).toLocaleString('ru-RU',{maximumFractionDigits:2}) + ' ₽'; };
  var periods=window.MSVContractPeriods;
  var today = new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Moscow'});
  async function api(path,body,method){var r=await fetch(path,{method:method||(body?'POST':'GET'),credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});var result=await r.json();if(!r.ok)throw Error(result.error||'Не удалось сохранить');return result;}
  async function change(path,body,method){try{data=await api(path,body,method);render();return true;}catch(e){alert(e.message);return false;}}
  async function reminders(){try{var items=await api('/api/vendor-reminders');var box=$('reminders');box.replaceChildren();items.filter(x=>!x.is_read).forEach(function(item){var row=document.createElement('p');row.className='notice';row.append(item.text+' ');var button=document.createElement('button');button.type='button';button.className='msv-link';button.textContent='Прочитано';button.onclick=async function(){button.disabled=true;try{await api('/api/vendor-reminders/'+item.id+'/read',{});await reminders();}catch(e){alert(e.message);button.disabled=false;}};row.append(button);box.append(row);});}catch(e){$('reminders').textContent='Не удалось загрузить напоминания. Обновите страницу.';}}
  function sum(c, month) { return c.payments.reduce(function(n,p){return n+periods.amount(p,month);},0); }
  function dueIn(c, month) {
    if (!c.due || c.status !== 'Действует') return false;
    var base = c.due.slice(0,7), delta = (+month.slice(0,4)- +base.slice(0,4))*12 + (+month.slice(5)- +base.slice(5));
    if(delta<0 || !(Number(c.frequency) ? delta % Number(c.frequency) === 0 : delta === 0))return false;
    var due=delta?periods.end(c.due,delta):c.due;
    return !c.until || due<=c.until;
  }
  function badge(c, month) {
    var paid = sum(c, month);
    if (paid > 0) return '<span class="badge ok">Оплачено ' + money(paid) + '</span>';
    if (paid > 0) return '<span class="badge soon">Часть: ' + money(paid) + '</span>';
    if (!dueIn(c,month)) return '—';
    var delta=(Number(month.slice(0,4))-Number(c.due.slice(0,4)))*12+Number(month.slice(5))-Number(c.due.slice(5,7));
    var date = delta?periods.end(c.due,delta):c.due, late = date < today;
    return '<span class="badge ' + (late?'late':'soon') + '">' + (late?'Просрочено':'К оплате') + '<br>' + money(c.amount) + '</span>';
  }
  function controls(c) { if(!configuring)return '';return '<span class="grip" draggable="true" data-drag="'+esc(c.id)+'" title="Перетащить">⠿</span>'; }
  var arrow="<svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M6 9l6 6 6-6\"/></svg>";
  function name(c) { var short=c.name;if(design==='groups'&&view==='calendar'){var endings={'Шаболовка':/\s+Шаболов(?:ка|ская)\s*$/i,'Варшавка':/\s+Варшавка\s*$/i,'Тверская':/\s+Тверская\s*$/i};if(endings[c.group])short=short.replace(endings[c.group],'');}
    return '<div class="contract-name"><button class="name" data-open="'+esc(c.id)+'">'+esc(short)+'</button><button class="tri" data-detail="'+esc(c.id)+'" aria-expanded="false" aria-label="Подробнее о '+esc(short)+'">'+arrow+'</button></div><div class="contract-details" data-details="'+esc(c.id)+'" hidden><p>Ответственный: '+esc(c.responsible||'—')+'</p><p>Исполнитель: '+esc(c.executor||'—')+'</p><p>'+esc(c.notes||'')+'</p></div>';
  }
  function render() {
    var list = data.filter(function(c) { return ($('group').value === 'Все' || c.group === $('group').value) && (c.name+' '+c.contact).toLowerCase().includes($('search').value.toLowerCase()); });
    $('yearLabel').hidden = view !== 'calendar';
    $('tableDesigns').hidden = view !== 'calendar';
    document.querySelectorAll('[data-design]').forEach(function(b){b.setAttribute('aria-pressed',b.dataset.design===design);});
    $('explain').textContent = {calendar:'Рекомендуемый вариант: вся история года перед глазами. Лучше всего заметны пропуски регулярных оплат.',table:'Компактный реестр: удобно искать контакты, проверять сроки договоров и работать со списком.',cards:'Для ежедневной работы и телефона: крупные карточки с ближайшими сроками. Для истории откройте договор.'}[view];
    document.querySelectorAll('[data-view]').forEach(function(b) { b.setAttribute('aria-pressed', b.dataset.view === view); });
    if (!list.length) { $('board').innerHTML='<p class="empty">Договоров по этим условиям нет.</p>'; return; }
    if (view === 'cards') {
      $('board').innerHTML='<div class="cards">'+list.map(function(c){return '<article class="card" data-row="'+esc(c.id)+'"><div>'+controls(c)+'</div><h3>'+name(c)+'</h3><p>'+esc(c.status)+' · '+esc(c.due || 'Срок не задан')+'</p><div class="money">'+money(c.amount)+'</div><div class="cardfoot">'+badge(c,(c.due || today).slice(0,7))+'</div></article>';}).join('')+'</div>';return;
    }
    var center=$('year').value||today.slice(0,7),parts=center.split('-'),months=Array.from({length:12},function(_,i){var d=new Date(Number(parts[0]),Number(parts[1])-1+i-5,1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');});
    if (view === 'calendar' && design !== 'classic') { renderDesign(list, months); return; }
    var heads=view==='calendar'?months.map(function(m){return '<th>'+new Date(m+'-02').toLocaleDateString('ru-RU',{month:'short',year:'2-digit'})+'</th>';}).join(''):'<th>Статус</th><th>Заключён</th><th>Следующая оплата</th><th>Сумма</th><th>Всего оплачено</th><th>Контакт</th>';
    $('board').innerHTML='<div class="scroll"><table class="'+view+'"><thead><tr><th>Договор / объект</th>'+heads+'</tr></thead><tbody>'+list.map(function(c){return '<tr data-row="'+esc(c.id)+'"><td>'+controls(c)+name(c)+'</td>'+(view==='calendar'?months.map(function(m){return '<td>'+badge(c,m)+'</td>';}).join(''):'<td>'+esc(c.status)+'</td><td>'+esc(c.signed||'Не указано')+'</td><td>'+esc(c.due||'Не задана')+'</td><td>'+money(c.amount)+'</td><td>'+money(c.payments.reduce(function(n,p){return n+Number(p.sum);},0))+'</td><td>'+esc(c.contact||'Не указан')+'</td>')+'</tr>';}).join('')+'</tbody></table></div>';
  }
  function renderDesign(list, months) {
    var descriptions={chess:'Шахматка: договор слева, оплаченные периоды залиты, плановые — контуром. Нажмите на месяц, чтобы открыть договор. Рекомендую этот вариант.',quarters:'Квартальные блоки: четыре крупных периода вместо двенадцати узких колонок. Удобно оценивать расходы по сезонам.',ledger:'Финансовая таблица: план и факт за выбранный год, остаток к оплате и ближайший срок. Подходит для сверки с бухгалтером.',groups:'Отдельная таблица на каждый объект: группы можно свернуть. Удобно обсуждать расходы Шаболовки, Варшавки и Тверской отдельно.'};
    $('explain').textContent=descriptions[design];
    function label(c){return '<td>'+controls(c)+name(c)+'</td>';}
    function plan(c){return months.filter(function(m){return dueIn(c,m);}).reduce(function(n,m){return n+c.amount;},0);}
    function actual(c){return months.reduce(function(n,m){return n+sum(c,m);},0);}
    function cell(c,m){var paid=sum(c,m),planned=dueIn(c,m),state=paid>0?'paid':planned?'planned':'blank';return '<td><button class="period '+state+'" data-open="'+esc(c.id)+'" title="'+esc(c.name+' · '+m)+'">'+(paid>0?money(paid):planned?money(c.amount):'—')+'<small>'+(state==='paid'?'Оплачено':state==='partial'?'Частично':state==='planned'?'План':'')+'</small></button></td>';}
    function grid(rows){return '<div class="scroll"><table class="calendar chess"><thead><tr><th>Договор / объект</th>'+months.map(function(m){return '<th>'+new Date(m+'-02').toLocaleDateString('ru-RU',{month:'short',year:'2-digit'})+'</th>';}).join('')+'</tr></thead><tbody>'+rows.map(function(c){return '<tr data-row="'+esc(c.id)+'">'+label(c)+months.map(function(m){return cell(c,m);}).join('')+'</tr>';}).join('')+'</tbody></table></div>';}
    if(design==='chess'){$('board').innerHTML=grid(list);return;}
    if(design==='groups'){$('board').innerHTML=groups.map(function(g){var rows=list.filter(function(c){return c.group===g;});return rows.length?'<details class="contract-group" open><summary>'+esc(g)+' <span>'+rows.length+' договоров</span>'+arrow+'</summary>'+grid(rows)+'</details>':'';}).join('');return;}
    if(design==='quarters'){$('board').innerHTML='<div class="scroll"><table class="quarters"><thead><tr><th>Договор</th>'+[1,2,3,4].map(function(q){return '<th>'+q+' квартал</th>';}).join('')+'</tr></thead><tbody>'+list.map(function(c){return '<tr data-row="'+esc(c.id)+'">'+label(c)+[0,3,6,9].map(function(start){var part=months.slice(start,start+3),p=part.reduce(function(n,m){return n+(dueIn(c,m)?c.amount:0);},0),a=part.reduce(function(n,m){return n+sum(c,m);},0);return '<td><div class="quarter-total">'+money(p)+'<small>План · оплачено '+money(a)+'</small></div>'+part.map(function(m){return '<div class="quarter-month"><span>'+m.slice(5)+'</span>'+badge(c,m)+'</div>';}).join('')+'</td>';}).join('')+'</tr>';}).join('')+'</tbody></table></div>';return;}
    $('board').innerHTML='<div class="scroll"><table class="ledger"><thead><tr><th>Договор</th><th>План за год</th><th>Оплачено за год</th><th>Осталось по плану</th><th>Ближайший срок</th><th>Действует до</th></tr></thead><tbody>'+list.map(function(c){var remaining=months.reduce(function(n,m){return n+(dueIn(c,m)?Math.max(0,c.amount-sum(c,m)):0);},0);return '<tr data-row="'+esc(c.id)+'">'+label(c)+'<td>'+money(plan(c))+'</td><td class="ledger-paid">'+money(actual(c))+'</td><td>'+money(remaining)+'</td><td>'+esc(c.due||'Не задан')+'</td><td>'+esc(c.until||'Не указан')+'</td></tr>';}).join('')+'</tbody></table></div>';
  }
  function history(c) { $('total').textContent='Всего оплачено: '+money(c.payments.reduce(function(n,p){return n+Number(p.sum);},0)); $('history').innerHTML=c.payments.map(function(p){return '<p>'+esc(p.paid)+' · '+money(p.sum)+' · за '+esc(periods.range(p).start)+' — '+esc(periods.last(p))+'</p>';}).join('')||'<p>Оплат пока нет.</p>'; }
  function open(id) {
    editing=id; var c=data.find(function(x){return x.id===id;}) || {name:'',group:'Общие',status:'Действует',amount:0,frequency:'1'};
    $('detailTitle').textContent=id?c.name:'Новый договор'; $('contractForm').reset();
    Array.from($('contractForm').elements).forEach(function(el){if(el.name)el.value=c[el.name] == null?(el.name==='reminderUnit'?'workdays':''):c[el.name];});
    $('payments').hidden=!id;
    if(id){history(c); $('paymentForm').elements.sum.value=c.amount;$('paymentForm').elements.start.value=c.due||today;$('paymentForm').elements.months.value=Number(c.frequency)||1;updatePeriod();$('paymentForm').elements.paid.value=today;}
    Array.from($('contractForm').elements).forEach(function(el){if(el.id!=='close')el.disabled=!configuring;});$('payments').hidden=!id;$('paymentForm').hidden=!configuring;
    $('detail').showModal();
  }
  function updatePeriod(){var f=$('paymentForm').elements;try{$('periodEnd').textContent='По '+periods.last({start:f.start.value,months:Number(f.months.value)})+' включительно. В календаре сумма распределяется по дням периода.';}catch(e){$('periodEnd').textContent=e.message;}}
  async function init() {
    $('paymentForm').addEventListener('input',updatePeriod);
    $('board').addEventListener('click',function(e){var b=e.target.closest('[data-detail]');if(!b)return;var d=Array.from($('board').querySelectorAll('[data-details]')).find(x=>x.dataset.details===b.dataset.detail);var open=b.getAttribute('aria-expanded')==='true';b.setAttribute('aria-expanded',String(!open));d.hidden=open;});
    data=await api('/api/vendor-contracts');reminders();setInterval(reminders,60000);
    groups.forEach(function(g){$('group').add(new Option(g,g));$('contractForm').elements.group.add(new Option(g,g));});
    $('year').value=today.slice(0,7);$('add').hidden=true;
    $('configure').onclick=function(){configuring=!configuring;this.setAttribute('aria-pressed',String(configuring));$('add').hidden=!configuring;render();};
    $('add').onclick=function(){open(null);};$('close').onclick=function(){$('detail').close();};

    ['group','search','year'].forEach(function(id){$(id).addEventListener('input',render);});
    document.querySelectorAll('[data-view]').forEach(function(b){b.onclick=function(){view=b.dataset.view;render();};});
    document.querySelectorAll('[data-design]').forEach(function(b){b.onclick=function(){design=b.dataset.design;render();};});
    $('board').onclick=function(e){var b=e.target.closest('[data-open]');if(b)open(b.dataset.open);};
    $('board').ondragstart=function(e){var grip=e.target.closest('[data-drag]');if(!grip||!configuring)return;dragged=grip.dataset.drag;e.dataTransfer.setData('text/plain',dragged);};
    $('board').ondragover=function(e){if(dragged)e.preventDefault();};
    $('board').ondragend=function(){dragged=null;};
    $('board').ondrop=async function(e){e.preventDefault();var row=e.target.closest('[data-row]');if(!row||!dragged||row.dataset.row===dragged)return;var ids=data.map(c=>c.id),id=ids.splice(ids.indexOf(dragged),1)[0];ids.splice(ids.indexOf(row.dataset.row),0,id);dragged=null;await change('/api/vendor-contracts/order',{ids:ids},'PUT');};
    $('contractForm').onsubmit=async function(e){e.preventDefault();var fields=Object.fromEntries(new FormData(this));fields.amount=Number(fields.amount);if(fields.reminderValue&&!fields.until){alert('Для уведомления укажите дату окончания договора');return;}var current=data.find(c=>c.id===editing);fields.version=current&&current.version;var button=this.querySelector('.msv-btn');button.disabled=true;try{if(await change('/api/vendor-contracts'+(editing?'/'+editing:''),fields,editing?'PUT':'POST'))$('detail').close();}finally{button.disabled=false;}};
    $('paymentForm').onsubmit=async function(e){e.preventDefault();var c=data.find(c=>c.id===editing),p=Object.fromEntries(new FormData(this));p.sum=Number(p.sum);p.months=Number(p.months);p.version=c.version;var button=this.querySelector('button');button.disabled=true;try{periods.end(p.start,p.months);if(await change('/api/vendor-contracts/'+editing+'/payments',p)){history(data.find(c=>c.id===editing));this.reset();this.elements.start.value=today;this.elements.months.value=1;this.elements.paid.value=today;updatePeriod();}}catch(error){alert(error.message);}finally{button.disabled=false;}};
    render();$('access').hidden=true;document.querySelector('main').hidden=false;
  }
  fetch('/api/auth/me',{credentials:'same-origin',cache:'no-store'}).then(function(r){return r.ok?r.json():null;}).then(function(me){if(me&&['admin','moderator'].includes(me.role))return init();else $('access').innerHTML='Доступно модератору и администраторам. <a href="login.html">Войти</a>';}).catch(function(){$('access').textContent='Не удалось проверить доступ. Обновите страницу.';});
})();
