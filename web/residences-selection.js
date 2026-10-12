(function(){'use strict';
var residences=[{id:'forma',name:'Forma',kind:'Комфорт-резиденция',metro:'Шаболовская',address:'Конный пер., 12',note:'1-, 2-, 4-, 8-местные номера, в том числе со своим санузлом и душем',photo:'photos/forma/03.jpg',logo:'mark-forma.png'},{id:'uyut',name:'Уют',kind:'Эконом-резиденция',metro:'Нагатинская',address:'Варшавское шоссе, 18к2',note:'2-, 4-, 6-, 8-местные номера и капсулы',photo:'photos/uyut/01.jpg',logo:'mark-uyut.png'},{id:'molod',name:'Молодежка',kind:'Квартира для девушек',metro:'Молодежная',address:'ул. Партизанская, 40',note:'Большая 3-комнатная квартира в престижном районе',photo:'photos/molod/01.jpg',logo:'mark-molod.png'}];

var maps={forma:'https://yandex.ru/maps/-/CTtSY62w',uyut:'https://yandex.ru/maps/-/CTtSYE5l',molod:'https://yandex.ru/maps/-/CTtSaI6E'};
var wishlist=[];try{wishlist=JSON.parse(localStorage.getItem('msv.residence-wishlist')||'[]');if(!Array.isArray(wishlist))wishlist=[];}catch(e){}
var preview=document.getElementById('preview');
function update(){preview.querySelectorAll('[data-wish]').forEach(function(b){var on=wishlist.includes(b.dataset.wish);b.setAttribute('aria-pressed',String(on));b.setAttribute('aria-label',(on?'Убрать из вишлиста: ':'Добавить в вишлист: ')+residences.find(r=>r.id===b.dataset.wish).name);});}
preview.className='v2';preview.innerHTML='<header class="screen-head"><p class="step">МСВ · Регистрация</p><h1>Выбери свою резиденцию</h1><p>Три места для студенческой жизни в Москве. Посмотри фотографии и сохрани понравившееся.</p></header><div class="cards">'+residences.map(function(r){return '<article class="card" data-residence="'+r.id+'"><div class="photo-wrap" data-gallery="'+r.id+'"><button class="photo-open" data-more="'+Math.max(0,MSV_PHOTOS.all(r.id).findIndex(p=>p.src===r.photo))+'" aria-label="Открыть галерею '+r.name+'"><img class="photo" src="'+r.photo+'" alt="'+r.name+' — фотография резиденции"><span class="photo-loupe" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg></span></button><button class="wish" data-wish="'+r.id+'" aria-pressed="false"><svg width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg></button></div><div class="content"><div class="identity"><img class="logo" src="'+r.logo+'" alt="Знак '+r.name+'"><div><h2>'+r.name+'</h2><p class="kind">'+r.kind+'</p></div></div><p class="metro">м. '+r.metro+'</p><p class="address"><a class="msv-link" target="_blank" rel="noopener" href="'+maps[r.id]+'">'+r.address+'</a></p><p class="note">'+r.note+'</p><div class="card-bottom"><p class="availability-note" data-availability="'+r.id+'" title="Свободные места на сегодня" aria-live="polite">Уточняем наличие</p><p class="price" data-price="'+r.id+'"></p><div class="actions"><a class="msv-btn learn" href="residence.html?id='+r.id+'">Подробнее</a><a class="msv-btn msv-btn--primary" href="rooms.html?res='+r.id+'">Выбрать</a></div></div></div></article>';}).join('')+'</div>';
preview.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;if(b.dataset.wish){wishlist=wishlist.includes(b.dataset.wish)?wishlist.filter(x=>x!==b.dataset.wish):wishlist.concat(b.dataset.wish);try{localStorage.setItem('msv.residence-wishlist',JSON.stringify(wishlist));}catch(e){}update();}});update();

function updatePrices(list){
 residences.forEach(function(r){
 var item=list.find(function(x){return x.id===r.id;});
 var prices=(item&&item.beds||[]).map(function(b){return Number(b.price);}).filter(function(n){return Number.isFinite(n)&&n>0;});
 if(prices.length)preview.querySelector('[data-price="'+r.id+'"]').textContent='от '+Math.round(Math.min.apply(null,prices)).toLocaleString('ru-RU')+' руб. / месяц';
 });
}
updatePrices(window.MSV_RESIDENCES||[]);
function places(n){return n%10===1&&n%100!==11?'место':n%10>=2&&n%10<=4&&(n%100<12||n%100>14)?'места':'мест';}
async function getData(url){var response=await fetch(url,{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error('Unavailable');return response.json();}
var loading=false;
async function refreshAvailability(){
 if(loading||document.hidden)return;loading=true;
 try{
  var list=await getData('/api/residences');if(!Array.isArray(list))throw new Error('Invalid residences');
  updatePrices(list);
  await Promise.all(residences.map(async function(r){
   var label=preview.querySelector('[data-availability="'+r.id+'"]');
   try{
    var residence=list.find(function(x){return x.id===r.id;});
    if(!residence||!Array.isArray(residence.beds))throw new Error('Missing beds');
    var occupancy=await getData('/api/occupancy?res='+encodeURIComponent(r.id));
    if(!Array.isArray(occupancy.busy))throw new Error('Missing occupancy');
    var busy=new Set(occupancy.busy.map(String));
    var total=new Set(residence.beds.map(function(b){return String(b.id);}));
    var free=Array.from(total).filter(function(id){return !busy.has(id);}).length;
    label.textContent=free?'Свободно '+free+' '+places(free):'Свободных мест пока нет';
   }catch(e){label.textContent='Уточняем наличие';}
  }));
 }catch(e){preview.querySelectorAll('[data-availability]').forEach(function(el){el.textContent='Уточняем наличие';});}
 finally{loading=false;}
}
refreshAvailability();
setInterval(refreshAvailability,60000);
document.addEventListener('visibilitychange',function(){if(!document.hidden)refreshAvailability();});
window.addEventListener('focus',refreshAvailability);
})();
