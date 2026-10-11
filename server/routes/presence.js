'use strict';
const auth = require('../lib/auth');
const {query} = require('../lib/db');
const {json, fail} = require('../lib/http');
const {defaults} = require('../lib/section-access');
module.exports = function(route) {
  async function actor(req,res) {
    const s=auth.readSession(req);
    if(!s){fail(res,401,'Не выполнен вход');return null;}
    const u=(await query('SELECT u.id,u.role,u.is_active,u.section_access,p.can_payroll FROM users u LEFT JOIN staff_profiles p ON p.user_id=u.id WHERE u.id=$1',[s.uid])).rows[0];
    if(!u || !u.is_active){fail(res,401,'Учётная запись отключена');return null;}
    return u;
  }
  route('POST','/api/presence',async(req,res)=>{
    if(req.previewSession){return fail(res,403,'Просмотр чужого кабинета не считается активностью');}
    const u=await actor(req,res);if(!u)return;
    // Timestamp is server-owned; the caller cannot mark another user online.
    await query("UPDATE users SET last_active_at=NOW() WHERE id=$1 AND (last_active_at IS NULL OR last_active_at < NOW()-INTERVAL '20 seconds')",[u.id]);
    json(res,200,{ok:true});
  });
  route('GET','/api/presence',async(req,res)=>{
    const u=await actor(req,res);if(!u)return;
    const raw=String(req.query.ids||'').split(',');
    if(raw.length>500 || raw.some(x=>! /^[1-9][0-9]{0,17}$/.test(x)))return fail(res,400,'Некорректный список пользователей');
    const rights={...defaults(u.role,u.can_payroll),...u.section_access};
    const residents=u.role==='admin'||(u.role!=='resident'&&(rights.residents||rights.chart||rights.charges));
    const staff=u.role==='admin'||(u.role!=='resident'&&rights.payroll);
    const r=await query(`SELECT id,last_active_at,is_active FROM users WHERE id=ANY($1::bigint[]) AND (id=$2 OR ($3::boolean AND role='resident') OR ($4::boolean AND role IN ('staff','moderator','admin')))`,[[...new Set(raw)],u.id,residents,staff]);
    res.setHeader('Cache-Control','no-store');
    json(res,200,{now:new Date().toISOString(),users:r.rows.map(x=>({id:String(x.id),lastActiveAt:x.last_active_at,active:x.is_active}))});
  });
};
