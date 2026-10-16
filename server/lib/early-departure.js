'use strict';
function iso(v){return v instanceof Date?v.toISOString().slice(0,10):String(v||'').slice(0,10);}
module.exports=function validateEarlySale(before,contract,body){
 const to=String(body.to||''),release=String(body.releaseFrom||'');
 const valid=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
 if(!contract||!contract.annual||before.moved_to||body.bedId&&String(body.bedId)!==String(before.bed_id)||!valid(to)||!valid(release)||to>=iso(before.date_to)||to>=iso(contract.date_to).slice(0,4)+'-09-01'||release<to){
  throw Object.assign(new Error('Не удалось подтвердить досрочное выставление места. Проверьте дату выезда и обновите шахматку.'),{status:409});
 }
};
