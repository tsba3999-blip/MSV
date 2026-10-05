(function () {
  'use strict';
  var groups = ['Шаболовка', 'Варшавка', 'Тверская', 'Общие', 'Не распределено'];
  var titles = ['Руслетелематика','Интернет МТС Шаболовка','Таском','Атол','Скала Шаболовка','Скала Варшавка','Эколайн ТБО','ЭЦП','Сертификаты','Аренда Шаболовская','Аренда Варшавка','Аренда Тверская','Коммуналка Шаболовская','Коммуналка Варшавка','Коммуналка Тверская','Налоги','Расходники','ЕТЦ ВО','Барьер рус','Шахматка Тл','ЭДО Контур','Персоналкин','Бухгалтерия'];
  var key = 'msv.contracts.preview.v1', data, editing = null, view = 'calendar', design = 'groups', dragged = null, configuring=false;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };
  var money = function (v) { return Number(v).toLocaleString('ru-RU') + ' ₽'; };
  var today = new Date().toLocaleDateString('en-CA');
  function seed() { return titles.map(function (name, i) {
    var group = /Шаболов/.test(name) ? 'Шаболовка' : /Варшав/.test(name) ? 'Варшавка' : /Тверск/.test(name) ? 'Тверская' : name === 'Бухгалтерия' ? 'Общие' : 'Не распределено';
    return { id: 'c' + i, name: name, group: group, number: '', signed: '', until: '', status: 'Действует', amount: (i + 1) * 1000, due: '2026-10-' + String(1 + i).padStart(2,'0'), frequency: ['ЭЦП','Сертификаты'].includes(name) ? '12' : '1', contact: '', contactInfo: '', notes: 'Демонстрационные сумма и срок. Замените своими данными.', payments: i % 3 === 0 ? [{ sum: (i + 1)*1000, period: '2026-09', paid: '2026-09-01' }] : [] };
  }); }
  function save() { try { localStorage.setItem(key, JSON.stringify(data)); } catch (_) { alert('Браузер не сохранил пример. Изменения останутся только до закрытия страницы.'); } }
  function sum(c, month) { return c.payments.filter(function (p) { return p.period === month; }).reduce(function (n,p) { return n + Number(p.sum); },0); }
  function dueIn(c, month) {
    if (!c.due || c.status !== 'Действует') return false;
    var base = c.due.slice(0,7), delta = (+month.slice(0,4)- +base.slice(0,4))*12 + (+month.slice(5)- +base.slice(5));
    return delta >= 0 && (Number(c.frequency) ? delta % Number(c.frequency) === 0 : delta === 0) && (!c.until || month <= c.until.slice(0,7));
  }
  function badge(c, month) {
    var paid = sum(c, month);
    if (paid >= c.amount && paid > 0) return '<span class="badge ok">Оплачено ' + money(paid) + '</span>';
    if (paid > 0) return '<span class="badge soon">Часть: ' + money(paid) + '</span>';
    if (!dueIn(c,month)) return '—';
    var date = month + c.due.slice(7), late = date < today;
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
    function cell(c,m){var paid=sum(c,m),planned=dueIn(c,m),state=paid>=c.amount&&paid>0?'paid':paid>0?'partial':planned?'planned':'blank';return '<td><button class="period '+state+'" data-open="'+esc(c.id)+'" title="'+esc(c.name+' · '+m)+'">'+(paid>0?money(paid):planned?money(c.amount):'—')+'<small>'+(state==='paid'?'Оплачено':state==='partial'?'Частично':state==='planned'?'План':'')+'</small></button></td>';}
    function grid(rows){return '<div class="scroll"><table class="calendar chess"><thead><tr><th>Договор / объект</th>'+months.map(function(m){return '<th>'+new Date(m+'-02').toLocaleDateString('ru-RU',{month:'short',year:'2-digit'})+'</th>';}).join('')+'</tr></thead><tbody>'+rows.map(function(c){return '<tr data-row="'+esc(c.id)+'">'+label(c)+months.map(function(m){return cell(c,m);}).join('')+'</tr>';}).join('')+'</tbody></table></div>';}
    if(design==='chess'){$('board').innerHTML=grid(list);return;}
    if(design==='groups'){$('board').innerHTML=groups.map(function(g){var rows=list.filter(function(c){return c.group===g;});return rows.length?'<details class="contract-group" open><summary>'+esc(g)+' <span>'+rows.length+' договоров</span>'+arrow+'</summary>'+grid(rows)+'</details>':'';}).join('');return;}
    if(design==='quarters'){$('board').innerHTML='<div class="scroll"><table class="quarters"><thead><tr><th>Договор</th>'+[1,2,3,4].map(function(q){return '<th>'+q+' квартал</th>';}).join('')+'</tr></thead><tbody>'+list.map(function(c){return '<tr data-row="'+esc(c.id)+'">'+label(c)+[0,3,6,9].map(function(start){var part=months.slice(start,start+3),p=part.reduce(function(n,m){return n+(dueIn(c,m)?c.amount:0);},0),a=part.reduce(function(n,m){return n+sum(c,m);},0);return '<td><div class="quarter-total">'+money(p)+'<small>План · оплачено '+money(a)+'</small></div>'+part.map(function(m){return '<div class="quarter-month"><span>'+m.slice(5)+'</span>'+badge(c,m)+'</div>';}).join('')+'</td>';}).join('')+'</tr>';}).join('')+'</tbody></table></div>';return;}
    $('board').innerHTML='<div class="scroll"><table class="ledger"><thead><tr><th>Договор</th><th>План за год</th><th>Оплачено за год</th><th>Осталось по плану</th><th>Ближайший срок</th><th>Действует до</th></tr></thead><tbody>'+list.map(function(c){var remaining=months.reduce(function(n,m){return n+(dueIn(c,m)?Math.max(0,c.amount-sum(c,m)):0);},0);return '<tr data-row="'+esc(c.id)+'">'+label(c)+'<td>'+money(plan(c))+'</td><td class="ledger-paid">'+money(actual(c))+'</td><td>'+money(remaining)+'</td><td>'+esc(c.due||'Не задан')+'</td><td>'+esc(c.until||'Не указан')+'</td></tr>';}).join('')+'</tbody></table></div>';
  }
  function history(c) { $('total').textContent='Всего оплачено: '+money(c.payments.reduce(function(n,p){return n+Number(p.sum);},0)); $('history').innerHTML=c.payments.map(function(p){return '<p>'+esc(p.paid)+' · '+money(p.sum)+' · за '+esc(p.period)+'</p>';}).join('')||'<p>Оплат пока нет.</p>'; }
  function open(id) {
    editing=id; var c=data.find(function(x){return x.id===id;}) || {name:'',group:'Общие',status:'Действует',amount:0,frequency:'1'};
    $('detailTitle').textContent=id?c.name:'Новый договор'; $('contractForm').reset();
    Array.from($('contractForm').elements).forEach(function(el){if(el.name)el.value=c[el.name] == null?'':c[el.name];});
    $('payments').hidden=!id;
    if(id){history(c); $('paymentForm').elements.sum.value=c.amount;$('paymentForm').elements.period.value=(c.due||today).slice(0,7);$('paymentForm').elements.paid.value=today;}
    Array.from($('contractForm').elements).forEach(function(el){if(el.id!=='close')el.disabled=!configuring;});$('payments').hidden=!configuring||!id;
    $('detail').showModal();
  }
  function init() {
    $('board').addEventListener('click',function(e){var b=e.target.closest('[data-detail]');if(!b)return;var d=Array.from($('board').querySelectorAll('[data-details]')).find(x=>x.dataset.details===b.dataset.detail);var open=b.getAttribute('aria-expanded')==='true';b.setAttribute('aria-expanded',String(!open));d.hidden=open;});
    try{data=JSON.parse(localStorage.getItem(key));}catch(_){} if(!Array.isArray(data))data=seed();
    groups.forEach(function(g){$('group').add(new Option(g,g));$('contractForm').elements.group.add(new Option(g,g));});
    $('year').value=today.slice(0,7);$('add').hidden=true;
    $('configure').onclick=function(){configuring=!configuring;this.setAttribute('aria-pressed',String(configuring));$('add').hidden=!configuring;render();};
    $('add').onclick=function(){open(null);};$('close').onclick=function(){$('detail').close();};
    $('reset').onclick=function(){if(confirm('Сбросить только демонстрационные договоры в этом браузере?')){data=seed();save();render();}};
    ['group','search','year'].forEach(function(id){$(id).addEventListener('input',render);});
    document.querySelectorAll('[data-view]').forEach(function(b){b.onclick=function(){view=b.dataset.view;render();};});
    document.querySelectorAll('[data-design]').forEach(function(b){b.onclick=function(){design=b.dataset.design;render();};});
    $('board').onclick=function(e){var b=e.target.closest('[data-open]');if(b){open(b.dataset.open);return;}b=e.target.closest('[data-move]');if(b){var i=data.findIndex(function(c){return c.id===b.dataset.id;}),j=i+Number(b.dataset.move);if(j>=0&&j<data.length){var c=data.splice(i,1)[0];data.splice(j,0,c);save();render();}}};
    $('board').ondragstart=function(e){var grip=e.target.closest('[data-drag]');if(!grip||!configuring)return;dragged=grip.dataset.drag;e.dataTransfer.setData('text/plain',dragged);};
    $('board').ondragover=function(e){if(dragged)e.preventDefault();};
    $('board').ondragend=function(){dragged=null;};
    $('board').ondrop=function(e){e.preventDefault();var row=e.target.closest('[data-row]');if(!row||!dragged||row.dataset.row===dragged)return;var i=data.findIndex(function(c){return c.id===dragged;}),c=data.splice(i,1)[0],j=data.findIndex(function(c){return c.id===row.dataset.row;});data.splice(j,0,c);dragged=null;save();render();};
    $('contractForm').onsubmit=function(e){e.preventDefault();var fields=Object.fromEntries(new FormData(this));fields.amount=Number(fields.amount);var c=data.find(function(c){return c.id===editing;});if(c)Object.assign(c,fields);else data.push(Object.assign(fields,{id:'new-'+Date.now(),payments:[]}));save();render();$('detail').close();};
    $('paymentForm').onsubmit=function(e){e.preventDefault();var c=data.find(function(c){return c.id===editing;}),p=Object.fromEntries(new FormData(this));p.sum=Number(p.sum);c.payments.push(p);save();history(c);render();};
    render();$('access').hidden=true;document.querySelector('main').hidden=false;
  }
  fetch('/api/auth/me',{credentials:'same-origin',cache:'no-store'}).then(function(r){return r.ok?r.json():null;}).then(function(me){if(me&&['admin','moderator'].includes(me.role))init();else $('access').innerHTML='Доступно модератору и администраторам. <a href="login.html">Войти</a>';}).catch(function(){$('access').textContent='Не удалось проверить доступ. Обновите страницу.';});
})();
