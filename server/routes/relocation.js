'use strict';
const auth=require('../lib/auth');
const {tx}=require('../lib/db');
const {readJson,json,fail}=require('../lib/http');
const relocation=require('../lib/relocation');
module.exports=function(route){
  for(const preview of [true,false])route('POST','/api/bookings/:id/relocation'+(preview?'/preview':''),async(req,res)=>{
    const s=auth.readSession(req);
    if(!s)return fail(res,401,'Войдите в кабинет');
    if(!auth.atLeast(s,'moderator'))return fail(res,403,'Переселяет модератор или администратор');
    const id=Number(req.params.id),body=await readJson(req);
    if(!Number.isSafeInteger(id))return fail(res,400,'Неверная бронь');
    try {const out=await tx(q=>preview?relocation.plan(q,id,body).then(p=>p.quote):relocation.execute(q,id,body,s.uid));json(res,200,out);}
    catch(e){if(e.code==='23P01')return fail(res,409,'Место уже занято. Выберите другое');if(e.status)return fail(res,e.status,e.message);throw e;}
  });
};
