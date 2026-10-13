'use strict';
const sources={university:'В вузе',recommendation:'Посоветовали',search:'В поисковике',maps:'На картах',social:'В соцсетях или Telegram',other:'Другое'};
const choices={search:['Яндекс','Google','Другой','Не помню'],maps:['Яндекс Карты','Google Карты','2ГИС','Другие']};
function normalize(value){
 if(value===null)return null;
 if(!value||typeof value!=='object'||Array.isArray(value)||!Object.hasOwn(sources,value.source))throw new Error('Выберите, откуда вы о нас узнали');
 if(value.detail!==undefined&&typeof value.detail!=='string')throw new Error('Проверьте уточнение источника');
 const detail=(value.detail||'').trim();
 if(detail.length>300)throw new Error('Уточнение — не больше 300 символов');
 if(choices[value.source]&&detail&&!choices[value.source].includes(detail))throw new Error('Выберите вариант уточнения из списка');
 return {source:value.source,detail};
}
module.exports={normalize};
