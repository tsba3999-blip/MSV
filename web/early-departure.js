(function(){'use strict';
function date(value){return new Date(value).toISOString().slice(0,10);}
function cutoff(booking){var end=date(booking.contractTo||booking.to);return end.slice(0,4)+'-09-01';}
function isEarly(booking,to,bed){return !!booking.contractId&&booking.annual!==false&&!booking.movedTo&&String(bed)===String(booking.bedId)&&!!to&&to<date(booking.to)&&to<cutoff(booking);}
window.MSVEarlyDeparture=function(box,booking){
 var to=box.querySelector('#bkTo'),bed=box.querySelector('#bkBed'),release=box.querySelector('#bkRel');
 var panel=document.createElement('div');panel.hidden=true;panel.className='msv-note';panel.style.margin='var(--msv-s16) 0';
 var note=document.createElement('p');note.textContent='Досрочный выезд до окончания годового контракта. Предлагаем выставить место на продажу с даты ниже. Учтите время на подготовку. Это подтверждение не расторгает договор и не пересчитывает скидку.';
 var label=document.createElement('label');label.style.cssText='display:flex;gap:var(--msv-s8);align-items:center';var check=document.createElement('input');check.type='checkbox';check.id='bkConfirmSale';label.append(check,document.createTextNode('Подтверждаю выставление места на продажу'));panel.append(note,label);release.closest('label').after(panel);
 var active=false,saved=release.value;
 function refresh(){check.checked=false;var next=isEarly(booking,to.value,bed.value);if(next){if(!active)saved=release.value;release.value=to.value;}else if(active)release.value=saved;active=next;panel.hidden=!active;}
 to.addEventListener('change',refresh);bed.addEventListener('change',refresh);release.addEventListener('input',function(){check.checked=false;});
 return function(){if(!active)return false;if(!check.checked)throw Error('Подтвердите выставление места на продажу.');if(!release.value||release.value<to.value)throw Error('Дата доступности места не может быть раньше выезда.');return true;};
};
})();
