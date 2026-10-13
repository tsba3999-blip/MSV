'use strict';
const auth=require('../lib/auth');
const {query}=require('../lib/db');
const {json,fail}=require('../lib/http');
const actions=['booking.move','booking.relocate','booking.sale.auto','hold.create','hold.cancel','hold.expire','deposit.add','room.create','room.update','room.delete','bed.create','bed.update','bed.delete'];
function date(value){if(!value)return 'не указано';const s=String(value).slice(0,10);return /^\d{4}-\d{2}-\d{2}$/.test(s)?s.split('-').reverse().join('.'):s;}
function describe(row){
 const p=row.payload||{},b=p.before||{},a=p.after||{},parts=[];
 const titles={'booking.move':'Изменение брони','booking.relocate':'Переселение','booking.sale.auto':'Место автоматически выставлено на продажу','hold.create':'Бронь без оплаты создана','hold.cancel':'Бронь без оплаты снята','hold.expire':'Истёк срок брони без оплаты','deposit.add':'Депозит внесён','room.create':'Комната добавлена','room.update':'Комната изменена','room.delete':'Комната удалена','bed.create':'Место добавлено','bed.update':'Место изменено','bed.delete':'Место удалено'};
 if(row.action==='booking.move'){
  for(const [key,label] of [['bed_id','Место'],['date_from','Заезд'],['date_to','Выезд'],['release_from','Выставлено на продажу с']]){
   const prev=key==='bed_id'?b[key]:date(b[key]),next=key==='bed_id'?a[key]:date(a[key]);
   if(prev!==next)parts.push(label+': '+(prev||'—')+' → '+(next||'—'));
  }
 }
 if(row.action==='booking.relocate'&&p.quote){parts.push((p.quote.oldPlace||b.bed_id||'—')+' → '+(p.quote.newPlace||p.quote.bedId||'—'));parts.push('С '+date(p.quote.since));}
 if(row.action.startsWith('hold.')){const place=p.bedId||b.bed_id;if(place)parts.push('Место: '+place);if(p.name||b.hold_name)parts.push(p.name||b.hold_name);if(p.hours)parts.push('На '+p.hours+' ч.');}
 if(row.action==='deposit.add')parts.push(Number(p.amount||0).toLocaleString('ru-RU')+' руб.');
 if(row.action==='booking.sale.auto')parts.push('С '+date(p.period));
 if(/^(room|bed)\./.test(row.action)){
  for(const [key,label] of [['name','Название'],['number','Номер'],['label','Место'],['price','Цена'],['gender','Пол'],['size','Вместимость'],['note','Примечание']]){
   if(p[key]!==undefined)parts.push(label+': '+String(p[key]));
  }
 }
 const target=String(row.target||'').replace(/^booking:/,'Бронь № ').replace(/^room:/,'Комната: ').replace(/^bed:/,'Место: ');
 return [titles[row.action]||row.action, target, ...parts].filter(Boolean).join(' · ');
}
module.exports=function register(route){
 route('GET','/api/shahmatka/history',async(req,res)=>{
  const s=auth.readSession(req);if(!s)return fail(res,401,'Войдите в кабинет');
  const u=(await query('SELECT role,is_active,section_access FROM users WHERE id=$1',[s.uid])).rows[0];
  if(!u||!u.is_active)return fail(res,401,'Учётная запись отключена');
  if(!['admin','moderator'].includes(u.role)||(u.role!=='admin'&&u.section_access&&u.section_access.chart===false))return fail(res,403,'Архив доступен администратору и модератору с доступом к шахматке');
  const cursor=req.query.before||null;if(cursor&&!/^[1-9]\d{0,17}$/.test(cursor))return fail(res,400,'Неверная страница');
  const out=await query(`SELECT a.id::text,a.created_at,a.action,a.target,a.payload,a.actor_id::text,
   u.name AS actor_name FROM audit_log a LEFT JOIN users u ON u.id=a.actor_id
   WHERE a.action=ANY($1::text[]) AND ($2::bigint IS NULL OR a.id<$2::bigint)
   ORDER BY a.id DESC LIMIT 51`,[actions,cursor]);
  const rows=out.rows.slice(0,50);
  json(res,200,{items:rows.map(r=>({id:r.id,at:r.created_at,description:describe(r),actor:r.actor_name||(r.actor_id?'Аккаунт № '+r.actor_id:'Система / автор не сохранён')})),next:out.rows.length>50?rows[rows.length-1].id:null});
 });
};
module.exports.describe=describe;
