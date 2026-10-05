(function(){
 var target=document.querySelector('.work__body');if(!target)return;
 var id=new URLSearchParams(location.search).get('id');if(!id)return;
 var button=document.createElement('button');button.className='msv-btn msv-btn--secondary';button.textContent='Редактировать данные';button.type='button';document.querySelector('.work__top').append(button);
 button.onclick=async function(){
  var list=await window.MSV_STAFF_LOAD(),person=list.find(function(x){return String(x.id)===id;});if(!person)return;
  var d=document.createElement('dialog');d.style.cssText='border:0;border-radius:20px;padding:24px;max-height:90svh;overflow:auto;width:min(600px,90vw)';
  var form=document.createElement('form');form.innerHTML='<h2 class="msv-sub">Редактировать данные</h2>';d.append(form);
  var fields=[['name','ФИО'],['position','Должность'],['phone','Телефон'],['email','Почта'],['birthday','Дата рождения','date'],['started','Работает с','date'],['salary','Оклад','number'],['payTo','Куда переводить'],['relation','Тип отношений']];
  fields.forEach(function(f){var l=document.createElement('label');l.className='msv-field';l.textContent=f[1];var input=document.createElement('input');input.className='msv-input';input.name=f[0];input.type=f[2]||'text';input.value=person[f[0]]??'';if(f[0]==='name')input.required=true;l.append(input);form.append(l);});
  var label=document.createElement('label');label.textContent='Место работы';var select=document.createElement('select');select.name='place';select.className='msv-input';Object.entries(window.MSV_STAFF_PLACE).forEach(function(x){var o=new Option(x[0]==='all'?'Администрация':x[1],x[0]);select.add(o);});select.value=person.place;label.append(select);form.append(label);
  var error=document.createElement('p');error.setAttribute('role','alert');form.append(error);
  var save=document.createElement('button');save.className='msv-btn msv-btn--primary';save.textContent='Сохранить';form.append(save);
  var cancel=document.createElement('button');cancel.type='button';cancel.className='msv-btn msv-btn--tertiary';cancel.textContent='Отмена';cancel.onclick=function(){d.close();};form.append(cancel);
  form.onsubmit=async function(e){e.preventDefault();save.disabled=true;var body=Object.fromEntries(new FormData(form));body.salary=body.salary===''?null:Number(body.salary);['birthday','started'].forEach(function(k){if(!body[k])delete body[k];});try{var r=await fetch('/api/staff/'+id,{method:'PATCH',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),j=await r.json();if(!r.ok)throw Error(j.error);location.reload();}catch(e){error.textContent=e.message;save.disabled=false;}};
  document.body.append(d);d.addEventListener('close',function(){d.remove();});d.showModal();
 };
})();
