'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path'),referral=require('../lib/referral');
for(const source of ['university','recommendation','search','maps','social','other'])assert.deepEqual(referral.normalize({source}),{source,detail:''});
assert.equal(referral.normalize(null),null);
assert.deepEqual(referral.normalize({source:'recommendation',detail:'  Анна  '}),{source:'recommendation',detail:'Анна'});
for(const bad of [{source:'unknown'},{source:'__proto__'},{source:'search',detail:'invalid'},{source:'maps',detail:'Google'},{source:'other',detail:'x'.repeat(301)},{source:'other',detail:3},[],true])assert.throws(()=>referral.normalize(bad));
let body={},session={uid:7},calls=[],routes={};
const box={module:{exports:{}},console,require:n=>n.endsWith('/auth')?{readSession:()=>session}:n.endsWith('/referral')?referral:n.endsWith('/names')?()=>true:n.endsWith('/profile-gender')?{resolve:async()=>null}:n.endsWith('/http')?{readJson:async()=>body,json:(r,status,result)=>Object.assign(r,{status,result}),fail:(r,status)=>r.status=status}:n.endsWith('/db')?{query:async()=>({rows:[{user_id:7,referral:{source:'maps',detail:'2ГИС'}}]}),tx:async fn=>fn(async(sql,args)=>{calls.push({sql,args});return {rows:[]}})}:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../routes/resident.js'),'utf8'),box);box.module.exports((m,p,h)=>routes[m+p]=h);
(async()=>{
 for(const value of [undefined,null,{source:'maps',detail:'2ГИС'}]){
 body=value===undefined?{}:{referral:value};calls=[];const r={};await routes['PUT/api/me/profile']({},r);assert.equal(r.status,200);
 const writes=calls.filter(c=>c.sql.includes('SET referral'));
 assert.equal(writes.length,value===undefined?0:1);
 if(writes.length){assert.equal(writes[0].args[0],7);assert.equal(writes[0].args[1],value===null?null:JSON.stringify(value));}
 }
 body={referral:{source:'invalid'}};calls=[];const bad={};await routes['PUT/api/me/profile']({},bad);assert.equal(bad.status,400);assert.equal(calls.length,0);
 const get={};await routes['GET/api/me/profile']({},get);assert.equal(get.result.referral.detail,'2ГИС');
 session=null;const no={};await routes['PUT/api/me/profile']({},no);assert.equal(no.status,401);
 console.log('PASS referral: six sources, optional details, limits, choices, absent preserves, null clears, own user save/read, authentication');
})().catch(e=>{console.error(e);process.exit(1)});
