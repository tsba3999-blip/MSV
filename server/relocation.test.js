'use strict';
const assert=require('node:assert/strict');
const relocation=require(process.env.RELOCATION_MODULE || './lib/relocation');
const {changes,monthAmount}=relocation;
assert.equal(changes('2026-10-16','2026-10-31',31000,62000)[0].delta,16000);
assert.equal(changes('2028-02-15','2028-02-29',29000,58000)[0].newAmount,30000);
assert.equal(changes('2027-08-16','2027-08-31',31000,62000)[0].delta,16000);
assert.equal(monthAmount('2026-10-01',[{start:'2026-09-01',finish:'2026-10-16',price:31000,moved_to:2},{start:'2026-10-16',finish:'2027-08-31',price:62000}]),47000);
if(!process.env.RELOCATION_TEST_DB){console.log('PASS: day formulas, leap February, August and split month');process.exit(0);}
const {Client}=require('pg');
(async()=>{
 const client=new Client({host:process.env.PGHOST||'/var/run/postgresql',database:process.env.RELOCATION_TEST_DB,user:process.env.PGUSER||'postgres'});await client.connect();
 const q=(sql,args)=>client.query(sql,args);
 try{
 await q('BEGIN');
 const u=(await q("INSERT INTO users(role,name,phone) VALUES('resident','Relocation fixture','79000007711') RETURNING id")).rows[0].id;
 await q("INSERT INTO residences(id,name,title) VALUES('rel-test','Test','Test')");
 await q("INSERT INTO rooms(id,residence_id,number,name,size) VALUES('rel-room','rel-test','1','Test',3)");
 await q("INSERT INTO beds(id,room_id,label,price) VALUES('rel-a','rel-room','A',31000),('rel-b','rel-room','B',62000),('rel-c','rel-room','C',15500)");
 const c=(await q("INSERT INTO contracts(user_id,date_from,date_to,price) VALUES($1,'2026-09-01','2027-08-31',31000) RETURNING id",[u])).rows[0].id;
 const b=(await q("INSERT INTO bookings(user_id,bed_id,date_from,date_to,contract_id) VALUES($1,'rel-a','2026-09-01','2027-08-31',$2) RETURNING id",[u,c])).rows[0].id;
 await q("INSERT INTO charges(booking_id,kind,period,amount) VALUES($1,'rent','2026-09-01',31000),($1,'rent','2026-10-01',31000),($1,'deposit','2027-08-01',31000)",[b]);
 await q('INSERT INTO payments(booking_id,amount) VALUES($1,93000)',[b]);
 const payments=JSON.stringify((await q('SELECT * FROM payments WHERE booking_id=$1',[b])).rows);
 const collision=(await q("INSERT INTO bookings(user_id,bed_id,date_from,date_to) VALUES($1,'rel-b','2027-07-01','2027-07-10') RETURNING id",[u])).rows[0].id;
 await assert.rejects(()=>relocation.plan(q,b,{bedId:'rel-b',since:'2026-10-16'}),/занято/);
 await q('DELETE FROM bookings WHERE id=$1',[collision]);
 const p=await relocation.plan(q,b,{bedId:'rel-b',since:'2026-10-16'});
 assert.equal(p.quote.months[0].revised,47000);assert.equal(p.quote.months.at(-1).revised,62000);
 await assert.rejects(()=>relocation.execute(q,b,{bedId:'rel-b',since:'2026-10-16',token:'stale'},u),/изменились/);
 const out=await relocation.execute(q,b,{bedId:'rel-b',since:'2026-10-16',token:p.quote.token},u);
 const rows=(await q('SELECT *,date_from::text AS start,date_to::text AS finish FROM bookings WHERE contract_id=$1 ORDER BY date_from',[c])).rows;
 assert.equal(rows.length,2);assert.equal(rows[0].finish,'2026-10-16');assert.equal(rows[0].bed_id,'rel-a');assert.equal(rows[1].start,'2026-10-16');assert.equal(rows[1].finish,'2027-08-31');assert.equal(rows[1].bed_id,'rel-b');
 assert.equal(JSON.stringify((await q('SELECT * FROM payments WHERE booking_id=$1',[b])).rows),payments);
 assert.equal(Number((await q('SELECT sum(paid) AS paid FROM booking_balance WHERE user_id=$1',[u])).rows[0].paid),93000);
 assert.equal(Number((await q("SELECT amount FROM charges WHERE booking_id=$1 AND period='2026-09-01'",[b])).rows[0].amount),31000);
 const august=(await q("SELECT amount FROM charges WHERE booking_id=$1 AND kind='deposit' AND cancelled_at IS NULL",[out.id])).rows[0];assert.equal(august.amount,62000);
 await assert.rejects(()=>relocation.plan(q,b,{bedId:'rel-c',since:'2026-11-01'}),/завершена/);
 const second=await relocation.plan(q,out.id,{bedId:'rel-c',since:'2026-11-01'});assert.equal(second.quote.months.at(-1).revised,15500);
 const cheaper=await relocation.execute(q,out.id,{bedId:'rel-c',since:'2026-11-01',token:second.quote.token},u);
 assert.equal(Number((await q("SELECT amount FROM charges WHERE booking_id=$1 AND kind='deposit' AND cancelled_at IS NULL",[cheaper.id])).rows[0].amount),15500);
 assert.equal(Number((await q('SELECT sum(paid) AS paid FROM booking_balance WHERE user_id=$1',[u])).rows[0].paid),93000);
 console.log('PASS: full-period availability, immutable previous stay/payment, prorating, deposit, stale quote, repeat move, cheaper place, no double balance');
 }finally{await q('ROLLBACK');await client.end();}
})().catch(e=>{console.error(e);process.exitCode=1;});
