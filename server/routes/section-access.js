'use strict';
const auth=require('../lib/auth'),{query}=require('../lib/db'),{json,fail,readJson}=require('../lib/http');
module.exports=function(route){route('PUT','/api/staff/:id/sections',async(req,res)=>{
 const s=auth.readSession(req);if(!s)return fail(res,401,'Не выполнен вход');
 const owner=(await query('SELECT can_edit_site FROM users WHERE id=$1 AND is_active',[s.uid])).rows[0];if(!owner?.can_edit_site)return fail(res,403,'Доступы меняет владелец');
 const id=Number(req.params.id),b=await readJson(req);const target=(await query('SELECT role,can_edit_site FROM users WHERE id=$1',[id])).rows[0];
 if(!target||target.role==='resident')return fail(res,404,'Сотрудник не найден');if(target.can_edit_site||target.role==='admin')return fail(res,400,'Полные права администратора здесь не изменяются');
 const keys=['chart','residents','tickets','charges','payroll'];if(Object.keys(b).some(k=>!keys.includes(k)||typeof b[k]!=='boolean'))return fail(res,400,'Неверный раздел');
 await query('UPDATE users SET section_access=section_access || $2::jsonb WHERE id=$1',[id,JSON.stringify(b)]);
 await query(`INSERT INTO audit_log(actor_id,action,target,payload) VALUES($1,'staff.sections',$2,$3)`,[s.uid,'user:'+id,JSON.stringify(b)]);json(res,200,{ok:true});
});};
