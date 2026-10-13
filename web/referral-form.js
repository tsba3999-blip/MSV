(function(){'use strict';
var root=document.getElementById('referralForm'),source='',detail='',loaded=false,touched=false;
var sources={university:'В вузе',recommendation:'Посоветовали',search:'В поисковике',maps:'На картах',social:'В соцсетях или Telegram',other:'Другое'};
var choices={search:['Яндекс','Google','Другой','Не помню'],maps:['Яндекс Карты','Google Карты','2ГИС','Другие']};
var labels={university:'В каком вузе?',recommendation:'Кого нам поблагодарить?',search:'В каком поисковике?',maps:'На каких картах?',social:'Где именно?',other:'Расскажите, где'};
var options=root.querySelector('[data-sources]'),box=root.querySelector('[data-detail]'),label=root.querySelector('[data-detail-label]'),input=root.querySelector('input'),sub=root.querySelector('[data-choices]');
Object.keys(sources).forEach(function(key){var b=document.createElement('button');b.type='button';b.className='chip';b.dataset.source=key;b.textContent=sources[key];b.setAttribute('aria-pressed','false');options.appendChild(b);});
function render(){
 options.querySelectorAll('button').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.source===source));});
 box.hidden=!source;if(!source)return;
 label.textContent=labels[source]+' — необязательно';
 var list=choices[source];input.hidden=!!list;input.disabled=!!list;sub.hidden=!list;sub.replaceChildren();
 if(list){list.forEach(function(text){var b=document.createElement('button');b.type='button';b.className='chip';b.textContent=text;b.setAttribute('aria-pressed',String(detail===text));b.onclick=function(){detail=detail===text?'':text;touched=true;loaded=true;render();};sub.appendChild(b);});}
 else{input.value=detail;input.placeholder=source==='recommendation'?'Имя или контакт':source==='social'?'Название, ссылка или аккаунт':'';}
}
options.addEventListener('click',function(e){var b=e.target.closest('[data-source]');if(!b)return;source=source===b.dataset.source?'':b.dataset.source;detail='';loaded=true;touched=true;render();});
input.addEventListener('input',function(){detail=input.value;loaded=true;touched=true;});
window.MSVReferralForm={get:function(){return loaded?(source?{source:source,detail:detail.trim()}:null):undefined;},set:function(value){if(touched||value===undefined)return;source=value&&Object.hasOwn(sources,value.source)?value.source:'';detail=source&&typeof value.detail==='string'?value.detail:'';loaded=true;render();}};
render();
})();
