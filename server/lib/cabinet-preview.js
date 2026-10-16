'use strict';
const auth=require('./auth'),{query}=require('./db'),{fail}=require('./http');
const COOKIE='msv_preview';
function canPreview(actor,target){return !!(actor?.is_active&&target&&((actor.role==='admin'&&actor.can_edit_site&&target.role!=='admin')||(actor.role==='moderator'&&target.role==='resident')));}
function cookie(value,age=1800){return COOKIE+'='+value+'; Path=/; HttpOnly; SameSite=Strict; Max-Age='+age;}
async function gate(req,res){
 const match=(req.headers.cookie||'').match(/(?:^|;\s*)msv_preview=([^;]+)/);if(!match)return true;
 const path=new URL(req.url,'http://localhost').pathname;
 if(path==='/api/cabinet-preview/stop' || ['/api/auth/request-pin','/api/auth/verify-pin','/api/auth/demo-login','/api/auth/logout'].includes(path))return true;
 function unavailable(){
  if(!path.startsWith('/api/')&&['GET','HEAD'].includes(req.method))return true;
  require('./http').json(res,409,{error:'Просмотр недоступен. Вернитесь в свой кабинет.',previewUnavailable:true});return false;
 }
 const token=auth._internal.verify(match[1]),owner=auth.readSession(req);
 if(!token)return unavailable();
 if(!owner||String(owner.uid)!==String(token.owner))return unavailable();
 const u=(await query('SELECT id,role,name,is_active,can_edit_site FROM users WHERE id=ANY($1::bigint[])',[[owner.uid,token.uid]])).rows;
 const actor=u.find(x=>String(x.id)===String(owner.uid)),target=u.find(x=>String(x.id)===String(token.uid));
 if(!target?.is_active||!canPreview(actor,target))return unavailable();
 if(!['GET','HEAD'].includes(req.method)){fail(res,403,'Это просмотр чужого кабинета. Вернитесь в свой кабинет, чтобы вносить изменения.');return false;}
 req.previewSession={uid:target.id,role:target.role,exp:token.exp};
 req.previewActor={name:actor.name,returnTo:token.returnTo};
 return true;
}
module.exports={gate,cookie,canPreview};
