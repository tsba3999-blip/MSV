'use strict';
const {query}=require('./db');
function defaults(role,pay){return {chartEdit:['admin','moderator'].includes(role),chart:role!=='resident',residents:['admin','moderator'].includes(role),tickets:role!=='resident',charges:['admin','moderator'].includes(role),payroll:role==='admin'||!!pay};}
function classify(path,method){
 path=path.replace(/\/+$/,'');
 if(path==='/api/shahmatka')return 'shared';
 if(method==='GET' && /^\/api\/residents\/[^/]+\/card$/.test(path))return 'residentCard';
 if(/^\/api\/(holds(?:\/|$)|bookings\/[^/]+(?:\/relocation(?:\/preview)?)?$)/.test(path))return 'chart';
 if(/^\/api\/(payments$|charges\/|bookings\/[^/]+\/deposit$)/.test(path))return 'charges';
 if(/^\/api\/residents\//.test(path)||/^\/api\/users\/[^/]+\/registration$/.test(path)||path==='/api/auth/invite'||path==='/api/requests/inbox')return 'residents';
 if(path.startsWith('/api/tickets'))return 'tickets';
 return null;
}
async function gate(req,res){
 const auth=require('./auth'),{fail}=require('./http'),s=auth.readSession(req);if(!s||s.role==='resident')return true;
 let pathname;try{pathname=new URL(req.url,'http://localhost').pathname;}catch{fail(res,400,'Неверный адрес');return false;}
 const key=classify(pathname,req.method);if(!key)return true;
 const r=await query('SELECT u.role,u.is_active,u.section_access,p.can_payroll FROM users u LEFT JOIN staff_profiles p ON p.user_id=u.id WHERE u.id=$1',[s.uid]);const u=r.rows[0];
 if(!u?.is_active){fail(res,401,'Учётная запись отключена');return false;}if(u.role==='admin')return true;
 const access={...defaults(u.role,u.can_payroll),...u.section_access};
 if(key==='chart' && req.method!=='GET' && (u.role!=='moderator'||!access.chartEdit)){fail(res,403,'Шахматка доступна только для просмотра');return false;}const allowed=key==='residentCard'?(access.chart||access.residents):key==='shared'?(access.chart||access.residents||access.charges):access[key];
 if(!allowed){fail(res,403,'Доступ к этому разделу отключён');return false;}
 // Elevation applies only to the narrowly classified section endpoint, never to account roles or settings.
 if(key==='residentCard' || (key!=='chart' && u.section_access[key]===true))req.sectionSession={...s,role:'moderator'};
 return true;
}
module.exports={defaults,classify,gate};
