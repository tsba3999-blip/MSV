'use strict';
const assert=require('node:assert/strict');
if(!String(process.env.DATABASE_URL).includes('msv_oct05_check'))throw Error('Isolated test database required');
const {query}=require('./lib/db'),auth=require('./lib/auth'),{server}=require('./index');
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 let serial=0;
 async function user(role,owner=false){const u=(await query('INSERT INTO users(role,name,can_edit_site,phone) VALUES($1,$2,$3,$4) RETURNING *',[role,'Тест Просмотра',owner,'+7900000080'+(++serial)])).rows[0];u.cookie=auth.sessionCookie(u).split(';')[0];return u;}
 const owner=await user('admin',true),other=await user('admin'),mod=await user('moderator'),staff=await user('staff'),resident=await user('resident');
 async function call(path,cookie,body,method){const r=await fetch(base+path,{method:method||(body?'POST':'GET'),headers:{cookie:cookie||'',...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')};}
 for(const u of [other,mod,staff,resident])assert.equal((await call('/api/cabinet-preview/start',u.cookie,{userId:resident.id})).status,403);
 for(const target of [resident,staff,mod]){
  const start=await call('/api/cabinet-preview/start',owner.cookie,{userId:target.id});assert.equal(start.status,200);
  const cookie=owner.cookie+'; '+start.cookie.split(';')[0];
  const me=await call('/api/auth/me',cookie);assert.equal(String(me.body.id),String(target.id));assert.equal(me.body.role,target.role);assert.equal(me.body.canEditSite,false);assert(me.body.preview);
  assert.equal((await call('/api/me/profile',cookie,{firstName:'Проверка'},'PUT')).status,403);
  assert.equal((await call('/api/auth/logout',cookie,{})).status,403);
  assert.equal((await call('/api/cabinet-preview/start',cookie,{userId:other.id})).status,403);
  const stop=await call('/api/cabinet-preview/stop',cookie,{});assert.equal(stop.status,200);assert.match(stop.cookie,/Max-Age=0/);
  assert.equal(String((await call('/api/auth/me',owner.cookie)).body.id),String(owner.id));
 }
 console.log('PASS owner-only preview, correct identity, blocked writes and preserved owner session');
 const preview=await call('/api/cabinet-preview/start',owner.cookie,{userId:resident.id}),viewCookie=owner.cookie+'; '+preview.cookie.split(';')[0];
 await query('UPDATE users SET is_active=false WHERE id=$1',[resident.id]);
 assert.equal((await call('/api/me/profile',viewCookie,{firstName:'Нельзя'},'PUT')).status,409);
 assert.equal((await call('/api/auth/me',viewCookie)).body.previewUnavailable,true);
 assert.equal((await call('/api/cabinet-preview/stop',viewCookie,{})).status,200);
 await query('UPDATE users SET is_active=true WHERE id=$1',[resident.id]);
 console.log('PASS disabled target cannot silently turn preview into owner writes');
 await query("INSERT INTO residences(id,name,title) VALUES('forma','FORMA','FORMA')");
 await query("INSERT INTO rooms(id,residence_id,number,name,size) VALUES('test-room','forma','1','Тест',1)");
 await query("INSERT INTO beds(id,room_id,label,price) VALUES('test-bed','test-room','1',100)");
 const booking=(await query("INSERT INTO bookings(user_id,bed_id,date_from,date_to) VALUES($1,'test-bed','2026-09-01','2027-08-31') RETURNING id",[resident.id])).rows[0].id;
 await query("INSERT INTO charges(booking_id,kind,period,amount) VALUES($1,'rent','2026-10-01',100),($1,'deposit','2027-08-01',100)",[booking]);
 await query("INSERT INTO payments(booking_id,amount,method,note) VALUES($1,100,'other','Депозит')",[booking]);
 let data=(await call('/api/shahmatka?res=forma',owner.cookie)).body;assert.equal(data.bookings[0].depositPaid,100);assert.equal(data.bookings[0].paid,100);assert.equal(data.bookings[0].depositAmount,100);
 await query('DELETE FROM payments WHERE booking_id=$1',[booking]);
 data=(await call('/api/shahmatka?res=forma',owner.cookie)).body;assert.equal(data.bookings[0].depositPaid,0);assert.equal(data.bookings[0].depositAmount,100);
 console.log('PASS deposit amounts distinguish charge from payment');
})().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});
