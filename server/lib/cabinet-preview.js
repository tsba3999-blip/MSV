'use strict';
const auth=require('./auth'),{query}=require('./db'),{fail}=require('./http');
const COOKIE='msv_preview';
function cookie(value,age=1800){return COOKIE+'='+value+'; Path=/; HttpOnly; SameSite=Strict; Max-Age='+age;}
async function gate(req,res){
 const match=(req.headers.cookie||'').match(/(?:^|;\s*)msv_preview=([^;]+)/);if(!match)return true;
 const path=new URL(req.url,'http://localhost').pathname;
 if(path==='/api/cabinet-preview/stop')return true;
 function unavailable(){
  if(!path.startsWith('/api/')&&['GET','HEAD'].includes(req.method))return true;
  require('./http').json(res,409,{error:'Просмотр недоступен. Вернитесь в свой кабинет.',previewUnavailable:true});return false;
 }
 const token=auth._internal.verify(match[1]),owner=auth.readSession(req);
 if(!token)return unavailable();
 if(!owner||String(owner.uid)!==String(token.owner))return unavailable();
 const u=(await query('SELECT id,role,name,is_active,can_edit_site FROM users WHERE id=ANY($1::bigint[])',[[owner.uid,token.uid]])).rows;
 const actor=u.find(x=>String(x.id)===String(owner.uid)),target=u.find(x=>String(x.id)===String(token.uid));
 if(!actor?.is_active||!actor.can_edit_site||actor.role!=='admin'||!target?.is_active)return unavailable();
 if(!['GET','HEAD'].includes(req.method)){fail(res,403,'Это просмотр чужого кабинета. Вернитесь в свой кабинет, чтобы вносить изменения.');return false;}
 req.previewSession={uid:target.id,role:target.role,exp:token.exp};
 req.previewActor={name:actor.name,returnTo:token.returnTo};
 return true;
}
module.exports={gate,cookie};
