'use strict';
if(!String(process.env.DATABASE_URL).endsWith('/msv_vendor_check'))throw Error('Isolated database required');
const assert=require('node:assert/strict'),{query}=require('./lib/db'),auth=require('./lib/auth'),{server}=require('./index'),{sweep}=require('./lib/vendor-reminders');
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;async function person(role){return (await query('INSERT INTO users(name,role,email) VALUES($1,$2,$3) RETURNING *',['Тест Подрядов',role,role+'@vendor-test.invalid'])).rows[0];}const admin=await person('admin'),mod=await person('moderator'),staff=await person('staff'),resident=await person('resident');
async function call(path,user,body,method){const r=await fetch(base+path,{method:method||(body?'POST':'GET'),headers:{Cookie:user?auth.sessionCookie(user).split(';')[0]:'','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,body:await r.json()};}
assert.equal((await call('/api/vendor-contracts',null)).status,401);for(const u of [staff,resident])assert.equal((await call('/api/vendor-contracts',u)).status,403);
let list=(await call('/api/vendor-contracts',admin)).body;assert.equal(list.length,23);assert(list.every(x=>x.amount===0&&x.payments.length===0&&!x.until));
const today=(await query('SELECT CURRENT_DATE::text AS d')).rows[0].d;const c={name:'Тест договор',group:'Общие',status:'Действует',signed:'2026-01-01',until:today,amount:12345.67,frequency:3,reminderValue:2,reminderUnit:'weeks'};
let r=await call('/api/vendor-contracts',mod,c);assert.equal(r.status,201);let row=r.body.find(x=>x.name===c.name);const id=row.id;
r=await call('/api/vendor-contracts/'+id+'/payments',admin,{start:'2026-10-17',months:3,paid:today,sum:12345.67,version:row.version});assert.equal(r.status,201);row=r.body.find(x=>x.id===id);assert.equal(row.payments[0].end,'2027-01-17');
assert.equal((await call('/api/vendor-contracts/'+id,admin,{...c,version:1},'PUT')).status,409);
assert.equal((await call('/api/vendor-contracts/'+id+'/payments',admin,{start:'2026-02-30',months:3,paid:today,sum:1,version:row.version})).status,400);
const sends=await Promise.all([sweep(),sweep()]);assert.equal(sends.reduce((a,b)=>a+b,0),2);assert.equal(await sweep(),0);let reminders=await call('/api/vendor-reminders',admin);assert.equal(reminders.body.length,1);assert.equal((await call('/api/vendor-reminders',mod)).body.length,1);
await call('/api/vendor-reminders/'+reminders.body[0].id+'/read',mod,{});assert.equal((await call('/api/vendor-reminders',admin)).body.length,1);await call('/api/vendor-reminders/'+reminders.body[0].id+'/read',admin,{});assert.equal((await call('/api/vendor-reminders',admin)).body.length,0);
list=(await call('/api/vendor-contracts',admin)).body;const ids=list.map(x=>x.id).reverse();r=await call('/api/vendor-contracts/order',admin,{ids},'PUT');assert.equal(r.status,200);assert.deepEqual(r.body.map(x=>x.id),ids);assert.equal((await call('/api/vendor-contracts/order',admin,{ids:[id,id]},'PUT')).status,400);
console.log('PASS real API persistence, role restrictions, conflict protection, order, period validation, exactly-once reminders and recipient isolation');
})().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)});
