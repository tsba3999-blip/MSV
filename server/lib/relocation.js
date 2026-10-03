'use strict';
const crypto = require('crypto');
const DAY = 86400000;
const day = value => Date.parse(String(value).slice(0,10)+'T00:00:00Z');
function validDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(value || '') && Number.isFinite(day(value)) && new Date(day(value)).toISOString().slice(0,10) === value; }
function changes(from, until, oldPrice, newPrice) {
  const result = [];
  let cursor = new Date(day(from));
  cursor.setUTCDate(1);
  while (cursor.getTime() <= day(until)) {
    const begin = cursor.getTime(), end = Date.UTC(cursor.getUTCFullYear(),cursor.getUTCMonth()+1,1);
    const days = (end-begin)/DAY, count = Math.max(0,(Math.min(end,day(until)+DAY)-Math.max(begin,day(from)))/DAY);
    const oldAmount=Math.round(oldPrice*count/days),newAmount=Math.round(newPrice*count/days);
    result.push({period:cursor.toISOString().slice(0,10),days,count,oldAmount,newAmount,delta:newAmount-oldAmount});
    cursor = new Date(end);
  }
  return result;
}
function problem(message,status=400) { return Object.assign(new Error(message),{status}); }
function monthAmount(period,segments) {
  const begin=day(period),d=new Date(begin),end=Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,1),days=(end-begin)/DAY;
  return segments.reduce((total,s)=>{
    const until=day(s.finish)+(s.moved_to?0:DAY);
    const count=Math.max(0,(Math.min(until,end)-Math.max(day(s.start),begin))/DAY);
    return total+Math.round(Number(s.price)*count/days);
  },0);
}
async function plan(q,id,body) {
  if (!validDate(body.since)) throw problem('Укажите корректную дату переезда');
  const found = await q(`SELECT b.*, b.date_from::text AS start, b.date_to::text AS finish,
      c.date_to::text AS contract_end, c.ended_at, c.annual, COALESCE(b.monthly_price,c.price,bd.price) AS old_price,
      bd.label AS old_label, (SELECT name FROM users WHERE id=b.user_id) AS resident_name,
      (SELECT r.name||' · '||rs.title FROM rooms r JOIN residences rs ON rs.id=r.residence_id WHERE r.id=bd.room_id) AS old_room
      FROM bookings b JOIN beds bd ON bd.id=b.bed_id LEFT JOIN contracts c ON c.id=b.contract_id
      WHERE b.id=$1 FOR UPDATE OF b`,[id]);
  const b = found.rows[0];
  if (!b || !b.user_id) throw problem('Бронь резидента не найдена',404);
  if (!b.contract_id || !b.annual) throw problem('Это переселение доступно для годового договора');
  await q('SELECT id FROM contracts WHERE id=$1 FOR UPDATE',[b.contract_id]);
  if (b.moved_to || b.ended_at) throw problem('Бронь уже завершена или переселена. Обновите шахматку',409);
  if (body.bedId === b.bed_id) throw problem('Выберите другое место');
  if (body.since <= b.start || body.since >= b.finish) throw problem('Дата переезда должна быть после заезда и до конца текущего проживания');
  if (b.finish !== b.contract_end) throw problem('Срок брони отличается от срока договора: сначала проверьте договор');
  const target = await q('SELECT bd.id,bd.price,bd.label,r.name AS room,rs.title AS residence FROM beds bd JOIN rooms r ON r.id=bd.room_id JOIN residences rs ON rs.id=r.residence_id WHERE bd.id=$1 FOR UPDATE OF bd',[body.bedId]);
  if (!target.rows[0]) throw problem('Место не найдено',404);
  const newPrice = Number(target.rows[0].price), oldPrice = Number(b.old_price);
  if (!newPrice || !oldPrice) throw problem('Не задана цена места');
  const busy = await q(`SELECT id FROM bookings WHERE bed_id=$1 AND id<>$2 AND date_from<=$4::date AND date_to>$3::date LIMIT 1`,[body.bedId,id,body.since,b.finish]);
  if (busy.rowCount) throw problem('Место занято в период от переезда до конца договора',409);
  const charges = await q(`SELECT ch.*, ch.period::text AS month FROM charges ch JOIN bookings x ON x.id=ch.booking_id
    WHERE x.contract_id=$1 AND ch.cancelled_at IS NULL AND ch.kind IN ('rent','deposit')
    AND ch.period>=date_trunc('month',$2::date)::date ORDER BY ch.period,ch.id FOR UPDATE OF ch`,[b.contract_id,body.since]);
  const months = changes(body.since,b.finish,oldPrice,newPrice);
  months.forEach(m=>{
    const rows=charges.rows.filter(ch=>ch.month===m.period);
    m.accrued=rows.reduce((n,ch)=>n+Number(ch.amount),0);
    m.revised=rows.length?m.accrued+m.delta:null;
    if(m.revised!==null&&m.revised<0)throw problem('Начисление за '+m.period.slice(0,7)+' меньше перерасчёта. Проверьте индивидуальную платёжку');
    m.deposit=rows.some(ch=>ch.kind==='deposit');
  });
  const token=crypto.createHash('sha256').update(JSON.stringify({id,b,bed:body.bedId,since:body.since,newPrice,charges:charges.rows})).digest('hex');
  return {b,charges:charges.rows,quote:{token,id,bedId:body.bedId,since:body.since,until:b.finish,oldPrice,newPrice,months,resident:b.resident_name,oldPlace:b.old_label+' · '+b.old_room,newPlace:target.rows[0].label+' · '+target.rows[0].room+' · '+target.rows[0].residence}};
}
async function execute(q,id,body,actor) {
  const p=await plan(q,id,body), b=p.b;
  if(body.token!==p.quote.token)throw problem('Данные изменились. Проверьте обновлённый перерасчёт и подтвердите снова',409);
  const balance=await q('SELECT accrued,paid FROM booking_balance WHERE booking_id=$1',[id]);
  const paidMonths=await q(`SELECT month FROM (SELECT to_char(ch.period,'YYYY-MM') AS month,
    SUM(SUM(ch.amount)) OVER(ORDER BY ch.period) AS upto FROM charges ch JOIN bookings x ON x.id=ch.booking_id
    WHERE x.contract_id=$1 AND ch.cancelled_at IS NULL AND ch.kind IN ('rent','deposit') AND ch.period IS NOT NULL
    GROUP BY ch.period) ledger WHERE upto<=$2`,[b.contract_id,balance.rows[0].paid]);
  const history={...balance.rows[0],paidMonths:paidMonths.rows.map(r=>r.month)};
  await q('UPDATE bookings SET date_to=$2, monthly_price=$3,history_finance=$4 WHERE id=$1',[id,body.since,p.quote.oldPrice,JSON.stringify(history)]);
  const created=await q(`INSERT INTO bookings(user_id,bed_id,date_from,date_to,source,tariff,note,contract_id,monthly_price)
    VALUES($1,$2,$3,$4,'transfer',$5,$6,$7,$8) RETURNING id`,[b.user_id,body.bedId,body.since,b.finish,b.tariff,b.note,b.contract_id,p.quote.newPrice]);
  const next=created.rows[0].id;
  await q('UPDATE bookings SET moved_to=$2 WHERE id=$1',[id,next]);
  for(const m of p.quote.months){
    const rows=p.charges.filter(ch=>ch.month===m.period);
    if(!rows.length||m.delta===0)continue;
    for(const row of rows)await q('UPDATE charges SET cancelled_at=now(),cancelled_by=$2 WHERE id=$1',[row.id,actor]);
    await q(`INSERT INTO charges(booking_id,kind,period,amount,due_date,note) VALUES($1,$2,$3,$4,$5,$6)`,[next,m.deposit?'deposit':'rent',m.period,m.revised,rows[0].due_date,'Перерасчёт с '+body.since+' при переселении. Исходные начисления: '+rows.map(r=>r.id).join(', ')]);
  }
  await q(`INSERT INTO audit_log(actor_id,action,target,payload) VALUES($1,'booking.relocate',$2,$3)`,[actor,'booking:'+id,JSON.stringify({before:b,newBookingId:next,quote:p.quote})]);
  return {...p.quote,id:String(next),previousId:String(id)};
}
module.exports={changes,validDate,plan,execute,monthAmount};
