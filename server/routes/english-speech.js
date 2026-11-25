'use strict';
const {json,fail,readJson,createLimiter}=require('../lib/http');
const auth=require('../lib/auth');
const {query}=require('../lib/db');
const {ORIGIN}=require('../lib/owner-recovery');

module.exports=function(route){
  const limit=createLimiter({windowMs:300000,max:30});
  let busy=false;
  route('POST','/api/english/transcribe',async(req,res)=>{
    const session=auth.readSession(req);
    if(!session)return fail(res,401,'Войдите в кабинет заново.');
    if(req.previewSession)return fail(res,403,'Запись доступна только в своём кабинете.');
    if(req.headers.origin!==ORIGIN||!String(req.headers['content-type']||'').startsWith('application/json'))return fail(res,403,'Откройте урок на сайте МСВ.');
    if(!limit(String(session.uid)))return fail(res,429,'Слишком много записей. Подождите несколько минут.');
    const {rows}=await query('SELECT role,is_active FROM users WHERE id=$1',[session.uid]);
    if(!rows[0]?.is_active||rows[0].role!==session.role)return fail(res,401,'Войдите в кабинет заново.');
    if(busy)return fail(res,503,'GOша обрабатывает другой ответ. Попробуйте через несколько секунд.');
    busy=true;
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),25000);
    const disconnected=()=>{if(!res.writableEnded)controller.abort();};
    res.on('close',disconnected);
    try{
      req.setTimeout(10000,()=>req.destroy());
      const body=await readJson(req,1500000);
      const encoded=body.audio;
      if(typeof encoded!=='string'||encoded.length>1400000||!encoded.length||encoded.length%4||!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded))return fail(res,400,'Не удалось прочитать запись. Запишите ответ ещё раз.');
      const data=Buffer.from(encoded,'base64');
      if(data.length<100||data.length>1024*1024)return fail(res,400,'Запись слишком короткая или длинная. Ответьте в пределах 20 секунд.');
      const port=Number(process.env.MSV_ENGLISH_SPEECH_PORT)||3034;
      const response=await fetch('http://127.0.0.1:'+port+'/transcribe',{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:data,signal:controller.signal});
      const result=await response.json();
      if(!response.ok)return fail(res,response.status===422?422:503,result.error||'Не удалось распознать ответ. Попробуйте ещё раз.');
      if(typeof result.text!=='string'||!result.text.trim()||result.text.length>1000)return fail(res,422,'Не удалось расслышать. Удерживайте GO и говорите ближе к микрофону.');
      json(res,200,{text:result.text.trim()});
    }catch{
      if(!res.destroyed&&!res.headersSent)fail(res,503,'GOша не смог обработать запись. Попробуйте ещё раз.');
    }finally{
      clearTimeout(timer);res.off('close',disconnected);busy=false;
    }
  });
};
