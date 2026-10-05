'use strict';
module.exports=function(body){
 return ['name','lastName','firstName','middleName'].every(k=>body[k]===undefined || body[k]===null || !String(body[k]).trim() || /^[А-Яа-яЁё\s'’-]+$/.test(String(body[k]).trim()));
};
