'use strict';
const {tx}=require('./db'),{remindAt}=require('./vendor-contracts');
function isWorkingDay(iso){const day=new Date(iso+'T00:00:00Z').getUTCDay();return day!==0&&day!==6;}
async function sweep(){return tx(async q=>{
 // One transaction and a unique delivery key prevent duplicate notices after restarts or parallel sweeps.
 const today=(await q('SELECT CURRENT_DATE::text AS today')).rows[0].today;
 const contracts=(await q('SELECT id,details FROM vendor_contracts ORDER BY id FOR UPDATE')).rows;
 const users=(await q("SELECT id FROM users WHERE is_active AND role IN ('admin','moderator')")).rows;
 let count=0;
 for(const row of contracts){const c=row.details;if(c.status!=='Действует')continue;const at=remindAt(c,isWorkingDay);if(!at||at>today)continue;
 const text='Договор «'+c.name+'» ('+c.group+') '+(c.until<today?'закончился':'заканчивается')+' '+c.until.split('-').reverse().join('.')+'. Проверьте продление в разделе «Подряды».';
 for(const u of users){const r=await q('INSERT INTO vendor_reminders(contract_id,user_id,deadline,lead_value,lead_unit,text) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING',[row.id,u.id,c.until,c.reminderValue,c.reminderUnit,text]);count+=r.rowCount;}}
 return count;
});}
module.exports={sweep,isWorkingDay};
