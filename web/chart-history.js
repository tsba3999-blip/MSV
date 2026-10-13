(function(){'use strict';
var cursor=null,loading=false,rows=document.getElementById('historyRows'),more=document.getElementById('historyMore'),status=document.getElementById('historyStatus');
async function load(){
 if(loading)return;loading=true;more.disabled=true;status.textContent='Загружаем историю…';
 try{
  var response=await fetch('/api/shahmatka/history'+(cursor?'?before='+encodeURIComponent(cursor):''),{credentials:'same-origin',cache:'no-store'});
  var data=await response.json();if(!response.ok)throw new Error(data.error||'Не удалось загрузить архив');
  data.items.forEach(function(item){
   var tr=document.createElement('tr');
   [new Date(item.at).toLocaleString('ru-RU',{timeZone:'Europe/Moscow'}),item.description,item.actor].forEach(function(value){var td=document.createElement('td');td.textContent=value;tr.appendChild(td);});
   rows.appendChild(tr);
  });
  cursor=data.next;more.hidden=!cursor;document.querySelector('.history-table').hidden=!rows.children.length;
  status.textContent=rows.children.length?'':'В журнале пока нет изменений шахматки.';
 }catch(e){status.textContent=e.message||'Сервер не отвечает';more.hidden=false;more.textContent='Повторить';}
 finally{loading=false;more.disabled=false;}
}
more.addEventListener('click',function(){more.textContent='Показать ещё';load();});load();
})();
