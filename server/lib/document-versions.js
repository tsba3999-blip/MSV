'use strict';
const fs=require('fs/promises'),path=require('path'),crypto=require('crypto');
const {config}=require('./db');
async function snapshot(q,kind){
 const page='doc-'+kind+'.html';
 await q('SELECT pg_advisory_xact_lock(hashtext($1))',[page]);
 const html=await fs.readFile(path.join(config.webDir,page),'utf8');
 const overrides=(await q('SELECT key,html FROM content_overrides WHERE page=$1 ORDER BY key',[page])).rows;
 const digest=crypto.createHash('sha256').update(JSON.stringify({html,overrides})).digest('hex');
 const r=await q(`INSERT INTO document_versions(kind,digest,html,overrides) VALUES($1,$2,$3,$4)
 ON CONFLICT(kind,digest) DO UPDATE SET digest=EXCLUDED.digest RETURNING id`,[kind,digest,html,JSON.stringify(overrides)]);
 return r.rows[0].id;
}
module.exports={snapshot};
