'use strict';
const auth=require('../lib/auth'),{query,tx}=require('../lib/db'),{json,fail}=require('../lib/http');
module.exports=function(route){
 route('GET','/api/documents/current',async(req,res)=>{
  const versions=await tx(async q=>{const out={};for(const kind of ['contract','rules','consent'])out[kind]=String(await require('../lib/document-versions').snapshot(q,kind));return out;});json(res,200,versions);
 });
 route('GET','/api/me/document-versions/:id',async(req,res)=>{
  const s=auth.readSession(req);if(!s)return fail(res,401,'Не выполнен вход');
  const r=await query(`SELECT v.* FROM document_versions v WHERE v.id=$1 AND EXISTS
    (SELECT 1 FROM doc_signatures s WHERE s.version_id=v.id AND s.user_id=$2)`,[req.params.id,s.uid]);
  if(!r.rows[0])return fail(res,404,'Подписанная редакция не найдена');json(res,200,r.rows[0]);
 });
};
