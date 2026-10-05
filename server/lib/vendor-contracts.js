'use strict';
const periods=require('../../web/contract-periods');
const GROUPS=['Шаболовка','Варшавка','Тверская','Общие','Не распределено'];
function validate(b){
 const c={};for(const key of ['name','group','number','signed','until','status','due','contact','contactInfo','responsible','executor','notes']){c[key]=String(b[key]||'').trim();if(c[key].length>(key==='notes'?2000:200))throw Error('Слишком длинное поле: '+key);}
 if(!c.name)throw Error('Укажите название договора');if(!GROUPS.includes(c.group))throw Error('Выберите группу');if(!['Действует','Приостановлен','Завершён'].includes(c.status))throw Error('Выберите статус');
 for(const key of ['signed','until','due'])if(c[key])periods.date(c[key]);if(c.signed&&c.until&&c.until<c.signed)throw Error('Окончание договора раньше подписания');
 c.amount=Number(b.amount);if(!Number.isFinite(c.amount)||c.amount<0||c.amount>1e10||Math.abs(c.amount*100-Math.round(c.amount*100))>0.0001)throw Error('Укажите сумму с точностью до копеек');
 c.frequency=Number(b.frequency);if(!Number.isInteger(c.frequency)||c.frequency<0||c.frequency>1200)throw Error('Периодичность: от 0 до 1200 месяцев');
 c.reminderValue=b.reminderValue===''||b.reminderValue==null?null:Number(b.reminderValue);c.reminderUnit=b.reminderUnit||'weeks';
 if(!['weeks','workdays'].includes(c.reminderUnit))throw Error('Выберите единицу срока');if(c.reminderValue!==null&&(!Number.isInteger(c.reminderValue)||c.reminderValue<1||c.reminderValue>365||!c.until))throw Error('Укажите окончание договора и срок уведомления от 1 до 365');
 return c;
}
function payment(b){const p={start:String(b.start||''),months:Number(b.months),paid:String(b.paid||''),sum:Number(b.sum)};p.end=periods.end(p.start,p.months);periods.date(p.paid);if(!Number.isFinite(p.sum)||p.sum<=0||p.sum>1e10||Math.abs(p.sum*100-Math.round(p.sum*100))>0.0001)throw Error('Укажите сумму оплаты с точностью до копеек');return p;}
function remindAt(c,isWorkingDay){if(!c.until||!c.reminderValue)return null;let d=periods.date(c.until);if(c.reminderUnit==='weeks'){d.setUTCDate(d.getUTCDate()-7*c.reminderValue);}else{let left=c.reminderValue;while(left){d.setUTCDate(d.getUTCDate()-1);if(isWorkingDay(d.toISOString().slice(0,10)))left--;}}return d.toISOString().slice(0,10);}
module.exports={validate,payment,remindAt,GROUPS};
