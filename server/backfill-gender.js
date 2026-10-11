'use strict';
const {query,tx} = require('./lib/db');
const {resolve} = require('./lib/profile-gender');
(async function () {
  const apply = process.argv.includes('--apply');
  const candidates = (await query(`SELECT u.id FROM users u LEFT JOIN resident_profiles p ON p.user_id=u.id WHERE u.role='resident' AND p.gender IS NULL`)).rows;
  let inferred = 0, unresolved = 0, changed = 0;
  for (const row of candidates) {
    const gender = await resolve(query, row.id, {});
    if (!gender) { unresolved++; continue; }
    inferred++;
    if (apply) await tx(async q => {
      const result = await q(`INSERT INTO resident_profiles(user_id,gender) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET gender=EXCLUDED.gender WHERE resident_profiles.gender IS NULL RETURNING user_id`, [row.id,gender]);
      if (result.rows.length) {
        changed++;
        await q(`INSERT INTO audit_log(action,target,payload) VALUES('resident.gender.auto',$1,$2)`, ['user:'+row.id,JSON.stringify({gender,method:'name-and-current-room-v1'})]);
      }
    });
  }
  console.log(JSON.stringify({apply,inferred,unresolved,changed}));
  process.exit(0);
})().catch(e=>{console.error(e.message);process.exit(1);});
