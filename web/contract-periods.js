(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.MSVContractPeriods=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  var DAY=86400000;
  function date(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value)))throw Error('Укажите дату');var d=new Date(value+'T00:00:00Z');if(!Number.isFinite(+d)||d.toISOString().slice(0,10)!==value)throw Error('Некорректная дата');return d;}
  function iso(d){return d.toISOString().slice(0,10);}
  function end(start,months){var d=date(start),n=Number(months);if(!Number.isInteger(n)||n<1||n>1200)throw Error('Количество месяцев: целое число от 1 до 1200');var target=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+n,1));var last=new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0)).getUTCDate();target.setUTCDate(Math.min(d.getUTCDate(),last));return iso(target);}
  function range(p){var start=p.start||p.period+'-01';return {start:start,end:p.end||end(start,p.months||1)};}
  function last(p){return iso(new Date(+date(range(p).end)-DAY));}
  // Allocate integer kopecks by cumulative elapsed days: monthly amounts sum exactly to the payment.
  function amount(p,month){var r=range(p),a=+date(r.start),b=+date(r.end),m=+date(month+'-01'),next=+date(end(month+'-01',1)),cents=Math.round(Number(p.sum)*100);if(b<=a||!Number.isFinite(cents))return 0;var lo=Math.max(a,Math.min(b,m)),hi=Math.max(a,Math.min(b,next));return (Math.round(cents*(hi-a)/(b-a))-Math.round(cents*(lo-a)/(b-a)))/100;}
  return {date:date,end:end,range:range,last:last,amount:amount};
});
