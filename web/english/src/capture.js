/* Hold to record; release to transcribe. No audio or transcript persistence. */
window.GOEVoice={create({change,result}){
  let phase='idle',held=false,token=0,stream,recorder,chunks=[],bytes=0,started=0,timer,request;
  const stopTracks=()=>{stream?.getTracks().forEach(track=>track.stop());stream=null;};
  const update=(next,message='')=>{phase=next;change(next,message);};
  function cancel(message=''){
    token++;held=false;clearTimeout(timer);request?.abort();request=null;
    if(recorder){recorder.ondataavailable=recorder.onstop=recorder.onerror=null;if(recorder.state==='recording')recorder.stop();recorder=null;}
    stopTracks();chunks=[];bytes=0;update(message?'error':'idle',message);
  }
  async function submit(id,duration){
    if(id!==token)return;
    if(duration<400||bytes<100)return cancel('Удерживайте GO, пока произносите ответ.');
    const blob=new Blob(chunks,{type:recorder.mimeType});chunks=[];recorder=null;
    update('processing');request=new AbortController();
    timer=setTimeout(()=>request?.abort(),30000);
    try{
      const data=new Uint8Array(await blob.arrayBuffer());let encoded='';
      for(let i=0;i<data.length;i+=32768)encoded+=String.fromCharCode(...data.subarray(i,i+32768));
      if(id!==token)return;
      const response=await fetch('/api/english/transcribe',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({audio:btoa(encoded)}),signal:request.signal});
      const body=await response.json();
      if(id!==token)return;
      if(!response.ok)throw new Error(body.error||'Не удалось обработать запись. Попробуйте ещё раз.');
      if(typeof body.text!=='string'||!body.text.trim())throw new Error('Не удалось расслышать. Повторите ответ.');
      clearTimeout(timer);request=null;update('idle');result(body.text.trim());
    }catch(error){
      if(id===token)cancel(error.name==='AbortError'?'Ответ обрабатывался слишком долго. Попробуйте ещё раз.':error instanceof TypeError?'Нет связи с сервером. Попробуйте ещё раз.':error.message);
    }
  }
  async function begin(){
    if(held||phase==='processing'||phase==='permission')return;
    if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)return update('error','Этот браузер не поддерживает запись. Откройте сайт в актуальном браузере.');
    held=true;const id=++token;update('permission');
    try{
      const input=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});
      if(id!==token||!held){input.getTracks().forEach(track=>track.stop());if(id===token)update('idle','Микрофон готов. Теперь удерживайте GO и говорите.');return;}
      stream=input;chunks=[];bytes=0;
      const mimeType=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus'].find(type=>MediaRecorder.isTypeSupported(type));
      recorder=new MediaRecorder(input,{...(mimeType?{mimeType}:{}),audioBitsPerSecond:24000});
      recorder.ondataavailable=event=>{
        if(id!==token||!event.data.size)return;
        bytes+=event.data.size;
        if(bytes>1024*1024)return cancel('Запись получилась слишком большой. Ответьте короче.');
        chunks.push(event.data);
      };
      recorder.onerror=()=>{if(id===token)cancel('Запись прервалась. Попробуйте ещё раз.');};
      recorder.onstop=()=>{stopTracks();if(id===token)submit(id,Date.now()-started);};
      recorder.start(250);started=Date.now();update('recording');timer=setTimeout(finish,20000);
    }catch(error){
      if(id!==token)return;
      cancel(error.name==='NotAllowedError'?'Разрешите доступ к микрофону в настройках браузера и повторите.':error.name==='NotFoundError'?'Микрофон не найден. Подключите его и повторите.':'Не удалось включить микрофон. Проверьте, не занят ли он другим приложением.');
    }
  }
  function finish(){
    held=false;clearTimeout(timer);
    if(recorder?.state==='recording'){update('processing');recorder.stop();stopTracks();}
  }
  return {begin,finish,cancel,get phase(){return phase;}};
}};
