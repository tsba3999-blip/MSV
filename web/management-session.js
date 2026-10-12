/* Management pages always use the signed-in owner, never a previous preview. */
(function(){
  if(location.protocol==='file:' || window.MSV_MANAGEMENT_READY)return;
  var nativeFetch=window.fetch.bind(window);
  var ready=nativeFetch('/api/cabinet-preview/stop',{method:'POST',credentials:'same-origin'}).then(function(r){if(!r.ok)throw Error('Не удалось завершить просмотр кабинета');});
  window.MSV_MANAGEMENT_READY=ready;
  window.fetch=function(){var args=arguments;return ready.then(function(){return nativeFetch.apply(null,args);});};
  ready.then(function(){window.fetch=nativeFetch;},function(){document.addEventListener('DOMContentLoaded',function(){var box=document.querySelector('.work__body');if(box)box.textContent='Не удалось вернуться в свой кабинет. Обновите страницу.';});});
})();
