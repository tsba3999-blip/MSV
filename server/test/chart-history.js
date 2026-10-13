'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
let session={uid:'7'},user={role:'moderator',is_active:true,section_access:{}},logs=[],queries=[],handler;
const box={module:{exports:{}},require:id=>id.endsWith('/auth')?{readSession:()=>session}:id.endsWith('/db')?{query:async(sql,args)=>{queries.push({sql,args});return {rows:sql.startsWith('SELECT role')?[user]:logs};}}:id.endsWith('/http')?{json:(r,status,body)=>Object.assign(r,{status,body}),fail:(r,status)=>r.status=status}:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../routes/chart-history.js'),'utf8'),box);box.module.exports((m,p,h)=>handler=h);
(async()=>{
 const call=async(before)=>{const r={};await handler({query:{before}},r);return r;};
 session=null;assert.equal((await call()).status,401);session={uid:'7'};
 for(const role of ['resident','staff']){user.role=role;assert.equal((await call()).status,403);}
 user.role='moderator';user.section_access={chart:false};assert.equal((await call()).status,403);
 user.section_access={};user.is_active=false;assert.equal((await call()).status,401);user.is_active=true;
 assert.equal((await call('1 OR 1=1')).status,400);
 logs=Array.from({length:51},(_,i)=>({id:String(100-i),created_at:'2026-10-13T10:00:00Z',action:'booking.move',target:'booking:8',actor_id:'7',actor_name:'Тестовый модератор',payload:{before:{bed_id:'a',date_to:'2027-08-30'},after:{bed_id:'b',date_to:'2027-08-31'},secret:'must not leak'}}));
 let r=await call();assert.equal(r.status,200);assert.equal(r.body.items.length,50);assert.equal(r.body.next,'51');assert.ok(r.body.items[0].description.includes('a → b'));assert.ok(r.body.items[0].description.includes('30.08.2027 → 31.08.2027'));assert.ok(!JSON.stringify(r.body).includes('must not leak'));
 await call('51');assert.equal(queries.at(-1).args[1],'51');
 logs=[];r=await call();assert.equal(r.body.next,null);assert.equal(r.body.items.length,0);
 console.log('PASS history: authentication, active roles, access, cursor, 50-row pagination, before/after, payload minimization');
})().catch(e=>{console.error(e);process.exit(1)});
