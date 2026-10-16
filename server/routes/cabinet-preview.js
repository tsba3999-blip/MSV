'use strict';
const auth=require('../lib/auth'),{query}=require('../lib/db'),{json,fail,readJson}=require('../lib/http'),{cookie,canPreview}=require('../lib/cabinet-preview');
module.exports=function(route){
 route('POST','/api/cabinet-preview/start',async(req,res)=>{
  const s=auth.readSession(req);if(!s)return fail(res,401,'Войдите в свой кабинет');
  const owner=(await query('SELECT role,can_edit_site,is_active FROM users WHERE id=$1',[s.uid])).rows[0];
  if(!owner?.is_active||!(owner.role==='moderator'||owner.role==='admin'&&owner.can_edit_site))return fail(res,403,'Недостаточно прав для просмотра кабинета');
  const b=await readJson(req),id=Number(b.userId);if(!Number.isSafeInteger(id)||id<=0)return fail(res,400,'Неверный номер пользователя');
  const target=(await query('SELECT id,name,role FROM users WHERE id=$1 AND is_active',[id])).rows[0];
  if(!target||target.role==='admin')return fail(res,400,'Выберите резидента или сотрудника');
  if(!canPreview(owner,target))return fail(res,403,'Модератор может просматривать только кабинеты резидентов');
  const returnTo=owner.role==='moderator'?'staff-residents.html':target.role==='resident'?'admin-residents.html':'admin-staff.html';
  const token=auth._internal.sign({uid:id,role:target.role,owner:s.uid,exp:s.exp,returnTo});
  await query("INSERT INTO audit_log(actor_id,action,target) VALUES($1,'cabinet.preview',$2)",[s.uid,'user:'+id]);
  json(res,200,{url:target.role==='resident'?'cabinet-resident.html':target.role==='moderator'?'admin-shahmatka.html':'cabinet-staff.html'},{'Set-Cookie':cookie(token,Math.max(1,Math.floor((s.exp-Date.now())/1000)))});
 });
 route('POST','/api/cabinet-preview/stop',async(req,res)=>json(res,200,{ok:true},{'Set-Cookie':cookie('',0)}));
};
