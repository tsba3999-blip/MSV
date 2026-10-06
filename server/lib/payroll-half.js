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
module.exports={preview};
