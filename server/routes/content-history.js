'use strict';
const auth = require('../lib/auth');
const {query,tx} = require('../lib/db');
const {json,fail,readJson} = require('../lib/http');
async function owner(req,res) {
  const s=auth.readSession(req);
  if(!s){fail(res,401,'Не выполнен вход');return null;}
  const r=await query('SELECT can_edit_site FROM users WHERE id=$1 AND is_active',[s.uid]);
  if(!r.rows[0]?.can_edit_site){fail(res,403,'История правок доступна владельцу');return null;}
  return s;
}
module.exports=function(route){
  route('GET','/api/content/history',async(req,res)=>{
    if(!await owner(req,res))return;
    const r=await query(`SELECT h.*,u.name AS author FROM content_history h LEFT JOIN users u ON u.id=h.actor_id
      WHERE ($1::text='' OR h.page=$1) AND ($2::text='' OR (h.created_at AT TIME ZONE 'Europe/Moscow')::date::text=$2)
      ORDER BY h.id DESC LIMIT 500`,[String(req.query.page||''),String(req.query.date||'')]);
    json(res,200,r.rows);
  });
  route('POST','/api/content/history/:id/restore',async(req,res)=>{
    const s=await owner(req,res);if(!s)return;
    const b=await readJson(req);
    if(!['before','after'].includes(b.version))return fail(res,400,'Выберите редакцию');
    const result=await tx(async q=>{
      const r=await q('SELECT * FROM content_history WHERE id=$1',[req.params.id]);
      const h=r.rows[0];if(!h)return null;
      await q('SELECT pg_advisory_xact_lock(hashtext($1))',[h.page]);
      const old=await q('SELECT html FROM content_overrides WHERE page=$1 AND key=$2',[h.page,h.key]);
      const html=b.version==='before'?h.before_html:h.after_html;
      await q('INSERT INTO content_history(page,key,before_html,after_html,actor_id) VALUES($1,$2,$3,$4,$5)',[h.page,h.key,old.rows[0]?.html??null,html,s.uid]);
      if(html===null)await q('DELETE FROM content_overrides WHERE page=$1 AND key=$2',[h.page,h.key]);
      else await q(`INSERT INTO content_overrides(page,key,html,updated_by) VALUES($1,$2,$3,$4)
        ON CONFLICT(page,key) DO UPDATE SET html=EXCLUDED.html,updated_by=EXCLUDED.updated_by,updated_at=now()`,[h.page,h.key,html,s.uid]);
      return {ok:true,page:h.page};
    });
    if(!result)return fail(res,404,'Правка не найдена');json(res,200,result);
  });
};
