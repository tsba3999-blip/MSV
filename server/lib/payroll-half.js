'use strict';
// Pure calculation. Date is supplied by PostgreSQL in Moscow time.
function preview(date,salary,mode){
 if(!['previous-half','current-month'].includes(mode))throw Error('Не задан порядок периодов зарплаты');
 const [year,month,day]=date.split('-').map(Number),late=day>=16;
 if(!Number.isInteger(salary)||salary<=0)throw Error('Сначала укажите месячный оклад сотрудника');
 const names=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
 const payday=(late?'16–17':'2–5')+' '+names[month-1]+' '+year;
 let y=year,m=month,first=1,last=15;
 if(mode==='previous-half'){if(!late){m--;if(!m){m=12;y--;}first=16;last=new Date(Date.UTC(y,m,0)).getUTCDate();}}
 else if(late){first=16;last=new Date(Date.UTC(y,m,0)).getUTCDate();}
 return {key:date.slice(0,7)+':'+(late?'2':'1'),amount:salary/2,salary,period:first+'–'+last+' '+names[m-1]+' '+y,payday};
}
function corrected(x,b){
 const baseline=b.corrected===true?Number(b.baseAmount):Number(b.amount);
 if(b.key!==x.key||baseline!==x.amount)throw Object.assign(Error('Оклад или период изменился. Повторите начисление и проверьте новые данные.'),{status:409});
 if(b.corrected!==true)return x;
 const amount=Number(b.amount),period=String(b.period||'').trim();
 if(!Number.isFinite(amount)||amount<=0||amount>2147483647||Math.abs(amount*100-Math.round(amount*100))>0.0001||!period||period.length>80)throw Object.assign(Error('Укажите положительную сумму с точностью до копеек и период до 80 символов'),{status:400});
 return {...x,amount,period,correction:{originalAmount:x.amount,originalPeriod:x.period}};
}
module.exports={preview,corrected};
