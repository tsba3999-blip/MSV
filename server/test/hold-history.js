'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
let inTx=false,failAudit=false,calls=[],routes={},missing=false;
const session={uid:'7',role:'moderator'};
async function q(sql,args){
 assert.ok(inTx,'mutation must be in a transaction');calls.push({sql,args});
 if(sql.includes('audit_log')){if(failAudit)throw Error('audit unavailable');return {rows:[]};}
 return {rows:missing?[]:[{id:42,bed_id:'bed-a',hold_name:'Тест',hold_until:new Date(),date_from:'2026-10-13',date_to:'2026-10-14'}]};
}
const box={module:{exports:{}},console,Date,require:n=>n.endsWith('/auth')?{readSession:()=>session,atLeast:()=>true}:n.endsWith('/db')?{query:async()=>({rows:[{id:'bed-a'}]}),tx:async fn=>{inTx=true;try{return await fn(q)}finally{inTx=false}}}:n.endsWith('/http')?{readJson:async()=>({bedId:'bed-a',name:'Тест',hours:24}),json:(r,status,body)=>Object.assign(r,{status,body}),fail:(r,status)=>r.status=status}:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../routes/holds.js'),'utf8'),box);box.module.exports((m,p,h)=>routes[m+p]=h);
(async()=>{
 for(const key of ['POST/api/holds','DELETE/api/holds/:id']){
  calls=[];let r={};await routes[key]({params:{id:42}},r);assert.ok([200,201].includes(r.status));assert.equal(calls.length,2);assert.ok(calls[1].sql.includes('audit_log'));assert.equal(calls[1].args[0],'7');
  if(key.startsWith('DELETE'))assert.equal(JSON.parse(calls[1].args[2]).before.bed_id,'bed-a');
  failAudit=true;r={};await assert.rejects(()=>routes[key]({params:{id:42}},r),/audit unavailable/);assert.equal(r.status,undefined);failAudit=false;
 }
 missing=true;const r={};await routes['DELETE/api/holds/:id']({params:{id:42}},r);assert.equal(r.status,404);
 console.log('PASS holds: mutation + history share transaction, deleted details retained, audit failure propagated, missing row handled');
})().catch(e=>{console.error(e);process.exit(1)});
