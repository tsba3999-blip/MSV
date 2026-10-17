'use strict';
const {query,tx}=require('../lib/db');
const {json,fail,readJson}=require('../lib/http');
const MAX=10*1024*1024;
function validate(b){
 const text=(k,n,required=false)=>{if(typeof b[k]!=='string'||b[k].length>n||(required&&!b[k].trim()))throw Error('Проверьте поле '+k);return b[k].trim();};
 const name=text('name',160,true),legalEntity=text('legalEntity',200),residence=text('residence',100),filename=text('filename',240,true);
 const ext=filename.split('.').pop().toLowerCase();
 const types={pdf:'application/pdf',jpg:'image/jpeg',jpeg:'image/jpeg',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'};
 if(!types[ext])throw Error('Допустимы PDF, JPG, DOC и DOCX');
 if(typeof b.data!=='string'||!b.data.length||b.data.length>Math.ceil(MAX/3)*4||(b.data.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(b.data)))throw Error('Некорректный файл или размер больше 10 МБ');
 const content=Buffer.from(b.data,'base64');
 if(!content.length||content.length>MAX)throw Error('Размер файла должен быть от 1 байта до 10 МБ');
 const hex=content.subarray(0,8).toString('hex');
 if(!(ext==='pdf'?content.subarray(0,5).toString()==='%PDF-':ext==='jpg'||ext==='jpeg'?hex.startsWith('ffd8ff'):ext==='doc'?hex==='d0cf11e0a1b11ae1':hex.startsWith('504b0304')))throw Error('Содержимое не соответствует формату файла');
 const until=b.validUntil||null;
 if(until&&(!/^\d{4}-\d{2}-\d{2}$/.test(until)||!Number.isFinite(Date.parse(until))||new Date(until).toISOString().slice(0,10)!==until))throw Error('Некорректный срок действия');
 return {name,legalEntity,residence,filename:filename.replace(/[\\/\r\n\x00-\x1f]/g,'_'),mime:types[ext],content,until};
}
module.exports=function(route,access){
 route('GET','/api/vendor-contracts/documents',async(req,res)=>{
  if(!await access(req,res))return;
  const r=await query('SELECT id::text,name,legal_entity AS "legalEntity",residence,valid_until::text AS "validUntil",filename,octet_length(content) AS size FROM vendor_documents ORDER BY created_at DESC,id DESC');json(res,200,r.rows);
 });
 route('POST','/api/vendor-contracts/documents',async(req,res)=>{
  const u=await access(req,res);if(!u)return;
  let d;try{d=validate(await readJson(req,15*1024*1024));}catch(e){if(!res.destroyed)fail(res,400,e.message);return;}
  const id=await tx(async q=>{const r=await q('INSERT INTO vendor_documents(name,legal_entity,residence,valid_until,filename,mime,content,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id::text',[d.name,d.legalEntity,d.residence,d.until,d.filename,d.mime,d.content,u.id]);await q("INSERT INTO audit_log(actor_id,action,target,payload) VALUES($1,'vendor.document.upload',$2,$3)",[u.id,'vendor-document:'+r.rows[0].id,JSON.stringify({name:d.name,filename:d.filename})]);return r.rows[0].id;});json(res,201,{id});
 });
 route('GET','/api/vendor-contracts/documents/:id/download',async(req,res)=>{
  if(!await access(req,res))return;if(!/^\d+$/.test(req.params.id))return fail(res,404,'Документ не найден');
  const d=(await query('SELECT filename,mime,content FROM vendor_documents WHERE id=$1',[req.params.id])).rows[0];if(!d)return fail(res,404,'Документ не найден');
  res.writeHead(200,{'Content-Type':d.mime,'Content-Length':d.content.length,'Content-Disposition':"attachment; filename=\"document\"; filename*=UTF-8''"+encodeURIComponent(d.filename).replace(/['()*]/g,c=>'%'+c.charCodeAt(0).toString(16)),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(d.content);
 });
};
module.exports.validate=validate;

