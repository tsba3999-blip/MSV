
(async()=>{
  'use strict';
  const root=document.getElementById('goe-prototype-states');
  const shell=root.querySelector('#goe-shell');
  async function session(){
    const response=await fetch('/api/auth/me',{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(10000)});
    if(response.status===401||response.status===403){location.replace('/login.html');return null;}
    if(!response.ok)throw new Error('Session unavailable');
    return response.json();
  }
  function unavailable(){
    shell.innerHTML='<p class="goe-session-message" role="alert">Не удалось проверить вход. <a href="/english">Попробовать снова</a></p>';
  }
  let me;
  try{me=await session();}catch{unavailable();return;}
  if(!me)return;
  const cabinet={admin:'/cabinet-admin.html',moderator:'/staff-shahmatka.html',staff:'/cabinet-staff.html'};
  root.querySelector('#goe-cabinet').href=cabinet[me.role]||'/menu.html';
  const lessonData=JSON.parse(document.getElementById('goe-lesson-data').textContent);
  const audioData=document.getElementById('goe-audio-data');
  if(!audioData){location.reload();return;}
  const audioFiles=JSON.parse(audioData.textContent).files;
  const audio=new Audio();
  audio.preload='none';
  const topics={
    travel:{label:'Travel',title:'В путь с английским',short:'В путешествии',ru:'Путешествия',desc:'Поездки, кафе и новые знакомства',color:'var(--goe-peach)',icon:'plane'},
    hotel:{label:'Hotel',title:'Заселяемся<br>в отель',short:'В отеле',ru:'Гостиница и гости',desc:'Бронирование, заселение и сервис',color:'var(--goe-mint)',icon:'key-round'},
    ai:{label:'AI',title:'Понимаем<br>технологии',short:'Говорим об ИИ',ru:'Технологии и ИИ',desc:'Слова, которые помогут учиться',color:'var(--goe-blue)',icon:'sparkles'},
    university:{label:'University',title:'Учимся<br>и общаемся',short:'На занятии',ru:'Учёба',desc:'Занятия, вопросы и общение',color:'var(--goe-lilac)',icon:'graduation-cap'},
    work:{label:'Work',title:'Английский<br>для работы',short:'На работе',ru:'Работа',desc:'Коллеги, встречи и повседневные задачи',color:'var(--goe-rose)',icon:'briefcase-business'}
  };
  const caps=[
    ['headphones','Помогу понимать речь','Будем слушать, повторять и разбирать фразы.'],
    ['messages-square','Помогу разговориться','Потренируем диалоги, которые пригодятся тебе.'],
    ['lightbulb','Объясню ошибки','Спокойно покажу, как сказать точнее.'],
    ['book-open','Проведу урок','Выберем интересную тему и понятный темп.'],
    ['heart','Поддержу и порадуюсь','Замечу маленькие победы и помогу продолжать.'],
    ['mic','Позанимаюсь голосом','Можно слушать и отвечать во время прогулки.']
  ];
  const dictionary=[['reservation','бронирование'],['check in','заселиться'],['breakfast','завтрак'],['pay by card','платить картой'],['receipt','чек']];
  const quizzes=[
    {question:'Как сказать «У меня есть бронирование»?',options:['I have a reservation.','I has a reservation.','I have reservation.'],answer:0,note:'С I используем have. Перед reservation в этой фразе нужен артикль a.'},
    {question:'Выбери «Я заплачу картой».',options:['I pay in card.','I will be pay by card.','I’ll pay by card.'],answer:2,note:'Устойчивое сочетание — by card. После will ставим pay, без be.'},
    {question:'Что означает receipt?',options:['Бронирование','Чек','Завтрак'],answer:1,note:'Receipt — чек. Фраза Do you need a receipt? означает «Вам нужен чек?».'}
  ];
  const state={screen:'welcome',name:String(me.name||'Участник').trim().split(/\s+/).slice(0,2).pop(),level:'A1',topic:'hotel',period:'week',goal:3,animations:true,modal:null,lessonIndex:0,translation:false,hint:false,answerOpen:false,feedback:null,paused:false,compact:false,speaking:false,completed:false,sessionCount:2,xpValue:120,missionAwarded:false,lastMissionBonus:0,lessonFinished:false,history:[],quizIndex:0,quizChoice:null,quizFeedback:false,quizScore:0,quizDone:false};
  let speechToken=0,speechTimer,toastTimer,modalFocusTimer;
  let motionContext=null,renderSnapshot=null,modalOrigin=null;
  const reducedMotion=typeof window.matchMedia==='function'?window.matchMedia('(prefers-reduced-motion: reduce)'):{matches:false};
  const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon=name=>`<i data-lucide="${name}" class="goe-icon" aria-hidden="true"></i>`;
  const mascot=(pose='hello',motion='float',extra='')=>`<div class="goe-mascot goe-pose-${pose} goe-${motion} ${extra}" data-pose="${pose}" role="img" aria-label="GOша: ${({hello:'приветствует',listen:'слушает',explain:'объясняет',success:'радуется',curious:'с любопытством обдумывает',rest:'отдыхает'})[pose]}"></div>`;
  const characterFrame=(pose,mode)=>`<div class="goe-character-frame" data-mood="${mode}">${mascot(pose,'none')}</div>`;
  const voiceBars=active=>`<span class="goe-voice-bars ${active?'is-active':''}" aria-hidden="true"><span></span><span></span><span></span><span></span></span>`;
  const capabilityExamples=[
    {pose:'listen',mode:'listening',label:'Слушает · пример',quote:'Сначала послушаем. Потом разберём по словам.',en:'What would you like to order?',ru:'Что ты хочешь заказать?'},
    {pose:'hello',mode:'encourage',label:'Подбадривает · пример',quote:'Можно начать с одной фразы. Я рядом.',en:'I’m learning English.',ru:'Я учу английский.'},
    {pose:'explain',mode:'explain',label:'Объясняет · пример',quote:'Давай поправим одно слово.',en:'I have a reservation.',ru:'С I используем have.',wrong:'I has a reservation.'},
    {pose:'explain',mode:'teaching',label:'Ведёт урок · пример',quote:'Один маленький шаг за раз.',en:'Do you have a reservation?',ru:'У вас есть бронирование?'},
    {pose:'success',mode:'success',label:'Радуется · пример',quote:'Получилось! Ещё одна фраза в твою копилку.',en:'You did it!',ru:'У тебя получилось.'},
    {pose:'listen',mode:'ready',label:'Голосовая практика · пример',quote:'Слушай вопрос и отвечай в своём темпе.',en:'Where would you like to go?',ru:'Куда ты хочешь поехать?'}
  ];
  function lessonMood(){
    if(state.paused)return {pose:'rest',mode:'rest',label:'Небольшая пауза',tone:'goe-resting'};
    if(state.feedback==='good')return {pose:'success',mode:'success',label:'Получилось!',tone:''};
    if(state.feedback==='retry')return {pose:'explain',mode:'explain',label:'Давай разберём',tone:'goe-warm'};
    if(state.speaking)return {pose:'explain',mode:'speaking',label:'GOша говорит',tone:''};
    if(state.answerOpen)return {pose:'listen',mode:'listening',label:'GOша слушает · демо',tone:''};
    if(state.hint)return {pose:'curious',mode:'thinking',label:'Подумаем вместе',tone:'goe-thinking'};
    return {pose:'listen',mode:'ready',label:'Твой ход',tone:''};
  }
  function capabilityMood(){
    const example=state.modal?.type==='capability'?capabilityExamples[state.modal.index]:null;
    if(!example)return null;
    return state.speaking?{...example,pose:'explain',mode:'speaking',label:'GOша говорит'}:example;
  }
  const button=(text,action,cls='goe-primary',extra='')=>`<button type="button" class="${cls} cursor-interaction" data-action="${action}" ${extra}>${text}</button>`;
  const xp=()=>state.xpValue;
  const sessions=()=>state.sessionCount;
  const lessonWord=n=>n%10===1&&n%100!==11?'занятие':n%10>=2&&n%10<=4&&!(n%100>=12&&n%100<=14)?'занятия':'занятий';
  const initial=()=>state.name.trim().slice(0,1).toLocaleUpperCase('ru')||'С';
  const status=()=>`<div class="goe-status" aria-hidden="true"><span>9:41</span><div class="goe-status-icons">${icon('signal')}${icon('wifi')}${icon('battery-full')}</div></div>`;
  const header=(intro=false)=>`<header class="goe-header"><div class="goe-brand">GO English</div>${intro?'<span class="goe-quiet-tag">Знакомство</span>':button(initial(),'profile','goe-avatar','aria-label="Открыть профиль"')}</header>`;
  const backbar=(label,action)=>`<div class="goe-backbar">${button(icon('arrow-left'),action,'goe-icon-button',`aria-label="${label}"`)}<span>${label}</span></div>`;
  function navigation(){
    return `<nav class="goe-nav" aria-label="Разделы приложения">${[['home','house','Главная'],['progress','chart-no-axes-column','Прогресс'],['lesson','','GOша'],['league','trophy','Лига'],['profile','user-round','Профиль']].map(([screen,ico,label])=>button(`${ico?icon(ico):`<span class="goe-nav-mascot">${mascot('hello','none')}</span>`}<span>${label}</span>`,screen,'',state.screen===screen?'aria-current="page"':'')).join('')}</nav>`;
  }
  function welcome(){
    return `${header(true)}<main class="goe-welcome"><div class="goe-welcome-art"><div class="goe-welcome-halo" aria-hidden="true"></div><span class="goe-welcome-spark" aria-hidden="true">${icon('sparkle')}</span><span class="goe-welcome-spark" aria-hidden="true">${icon('sparkles')}</span>${button(mascot('hello','none'),'replay-welcome','goe-mascot-trigger','aria-label="Ещё раз поздороваться с GOшей"')}</div><h1>Привет, ${esc(state.name)}!</h1><p class="goe-intro-name">Меня зовут GOша.</p><p class="goe-intro-copy">Я помогу тебе говорить по-английски<br>и понимать собеседника.<br>Будем учиться в твоём темпе.</p><div class="goe-intro-action">${button(`Давай начнём ${icon('arrow-right')}`,'goals')}</div><div class="goe-intro-action">${button(`Что я умею? ${icon('sparkles')}`,'about','goe-secondary')}</div><p class="goe-intro-foot">Маленькие шаги. Настоящие открытия.</p></main>`;
  }
  function about(){
    return `${header(true)}${backbar('Знакомство','welcome')}<main class="goe-content"><div class="goe-about-title"><div><h1>Что я умею?</h1><p class="goe-muted">Нажми и посмотри на примере.</p></div>${mascot('explain','nod')}</div><div class="goe-capabilities">${caps.map(([ico,title,copy],index)=>button(`<span class="goe-capability-icon">${icon(ico)}</span><span class="goe-capability-copy"><span class="goe-capability-title">${title}</span><span class="goe-capability-detail">${copy}</span></span><span class="goe-capability-chevron">${icon('chevron-right')}</span>`,'capability','goe-capability',`data-capability="${index}" aria-haspopup="dialog"`)).join('')}</div>${button(`Давай начнём ${icon('arrow-right')}`,'goals')}</main>`;
  }
  function goals(){
    return `${header(true)}${backbar('Знакомство','welcome')}<main class="goe-content"><h1>Что тебе интересно?</h1><p class="goe-muted">Начнём с того, что пригодится тебе.<br>Тему можно поменять в любой момент.</p><div class="goe-goals">${Object.entries(topics).map(([key,t])=>button(`${icon(t.icon)}<span class="goe-goal-copy"><h3>${t.ru}</h3><p>${t.desc}</p></span>${state.topic===key?`<span class="goe-selected">${icon('circle-check')}</span>`:''}`,'topic','goe-goal',`data-topic="${key}" aria-pressed="${state.topic===key}" style="background:${t.color}"`)).join('')}</div><div class="goe-row" style="margin:12px 0 20px"><span class="goe-muted">Начнём с простых фраз</span>${button(`${state.level} ${icon('chevron-down')}`,'level','goe-level')}</div>${button(`К моим урокам ${icon('arrow-right')}`,'home')}</main>`;
  }
  function home(){
    const t=topics[state.topic];
    const marks=Array.from({length:state.goal},(_,i)=>`${i?'<span class="goe-session-connector"></span>':''}<span class="goe-session-mark ${i<sessions()?'goe-done':''}">${i<sessions()?icon('check'):''}</span>`).join('');
    return `${header()}<main class="goe-content"><h1>Мой английский</h1><div class="goe-row">${button(`${state.level} · ${state.level==='A1'?'Начальный':'Мой уровень'} ${icon('chevron-down')}`,'level','goe-level')}${button(`Уточнить уровень ${icon('chevron-right')}`,'level','goe-link')}</div><div class="goe-topics" aria-label="Тема занятия">${Object.entries(topics).map(([key,t])=>button(`${t.label}${state.topic===key?icon('check'):''}`,'topic','goe-topic',`data-topic="${key}" aria-pressed="${state.topic===key}"`)).join('')}</div><section class="goe-hero" style="${state.topic!=='hotel'?`background:linear-gradient(130deg,${t.color},#f5f2fe 62%,#e1f3f4)`:''}"><div class="goe-hero-copy"><p class="goe-eyebrow">Урок с GOшей</p><h2>${t.title}</h2><p class="goe-meta">Слушаем и говорим · 15 мин</p></div>${mascot('hello','float')}${button(`<span>${state.lessonFinished?'Ещё один разговор':state.lessonIndex===0?'Начать урок':'Продолжить урок'}</span>${icon('arrow-right')}`,'lesson')}</section><section class="goe-week"><div class="goe-row"><div><h2>Моя неделя</h2><p class="goe-muted">${sessions()} из ${state.goal} занятий</p></div><div class="goe-session-marks" aria-label="Выполнено ${sessions()} из ${state.goal} занятий">${marks}</div></div><div class="goe-week-footer"><span>${sessions()>=state.goal?'План выполнен. Отличный темп!':'Следующее занятие — завтра'}</span>${button(icon('sliders-horizontal'),'plan','','aria-label="Настроить план"')}</div></section><div class="goe-shortcuts">${[['dictionary','book-open','Словарь'],['history','clock-3','История'],['exams','graduation-cap','Экзамены']].map(([a,i,l])=>button(`${icon(i)}<span>${l}</span>`,a,'goe-shortcut')).join('')}</div></main>${navigation()}`;
  }
  function progress(){
    const week=state.period==='week';const count=week?sessions():state.period==='month'?sessions()+6:sessions()+10;const mins=week?(sessions()*15):state.period==='month'?120:180;
    const skills=[['Аудирование','headphones',state.completed?7:6,8,'var(--goe-blue)','#498ad4'],['Разговор','message-circle',state.completed?4:3,5,'var(--goe-mint)','#1a9a89'],['Чтение','book-open',4,5,'var(--goe-lilac)','#a772df'],['Письмо','pencil',2,4,'var(--goe-peach)','#dc9292']];
    return `${header()}<main class="goe-content"><h1>Мой прогресс</h1><div class="goe-periods" aria-label="Период прогресса">${[['week','Неделя'],['month','Месяц'],['all','Всё время']].map(([key,label])=>button(label,'period','goe-period',`data-period="${key}" aria-pressed="${state.period===key}"`)).join('')}</div><section class="goe-summary"><div class="goe-summary-copy"><p class="goe-eyebrow">${week?'На этой неделе':state.period==='month'?'За этот месяц':'За всё время'}</p><div class="goe-summary-value">${count} ${lessonWord(count)}</div><p class="goe-muted">${mins} минут практики</p><span class="goe-xp">${week?xp():xp()+(state.period==='month'?360:600)} XP</span></div>${mascot('rest','float')}</section><h2 class="goe-section-title">Практика по навыкам</h2><div class="goe-skills">${skills.map(([label,ico,done,total,color,mark])=>button(`<div class="goe-skill-header">${icon(ico)}<div><h3>${label}</h3><p>${done} из ${total} заданий</p></div></div><div class="goe-segments" aria-hidden="true">${Array.from({length:total},(_,i)=>`<span class="${i<done?'goe-filled':''}"></span>`).join('')}</div>`,'skill','goe-skill',`data-skill="${label}" style="background:${color};--skill-color:${mark}" aria-label="${label}, выполнено ${done} из ${total} заданий"`)).join('')}</div>${button(`${icon('repeat-2')}<span class="goe-grow"><h3>Стоит повторить</h3><p>Вопросы при заселении</p></span>${icon('arrow-right')}`,'repeat-hotel','goe-repeat-row')}${button(`${icon('graduation-cap')}Проверить знания`,'exams')}</main>${navigation()}`;
  }
  function league(){
    const rows=[['Анна',240,'А','var(--goe-lilac)'],['Михаил',180,'М','var(--goe-blue)'],['Ты',xp(),initial(),'#bce8dd'],['Ольга',100,'О','var(--goe-peach)']].sort((a,b)=>b[1]-a[1]);const place=rows.findIndex(r=>r[0]==='Ты')+1;
    return `${header()}<main class="goe-content"><h1>Лига резидентов</h1><div class="goe-row"><span class="goe-level">${state.level} · Начальная лига</span><span class="goe-muted">Эта неделя</span></div><section class="goe-summary goe-celebration"><div class="goe-summary-copy"><p class="goe-eyebrow">Твои очки за неделю</p><div class="goe-summary-value">${xp()} XP</div><span class="goe-place">${place} место</span></div>${mascot('success','cheer')}</section><div class="goe-ranking" aria-label="Рейтинг недели">${rows.map(([name,score,letter,color],i)=>`<div class="goe-rank-row ${name==='Ты'?'goe-self':''}"><span class="goe-rank-number">${i+1}</span><span class="goe-initial" style="background:${color}">${esc(letter)}</span><span>${name}</span><span class="goe-rank-score">${score} XP</span></div>`).join('')}</div><section class="goe-mission"><div class="goe-row"><h3>Миссия недели</h3><span class="goe-reward">Награда: +40 XP</span></div><h2>${state.completed?'Миссия выполнена!':'Заверши 3 занятия'}</h2><p class="goe-muted">${Math.min(sessions(),3)} из 3</p><div class="goe-track" role="progressbar" aria-label="Миссия недели" aria-valuenow="${Math.min(sessions(),3)}" aria-valuemin="0" aria-valuemax="3"><span style="width:${Math.min(sessions()/3*100,100)}%"></span></div></section><div class="goe-league-bottom">${button(`Бонусы к репутации ${icon('arrow-right')}`,'reputation','goe-link')}<p class="goe-voluntary">Участие в лиге — по желанию</p></div></main>${navigation()}`;
  }
  function lesson(){
    const steps=lessonData[state.topic],step=steps[state.lessonIndex];
    const mood=lessonMood();
    const voiceActive=!state.paused&&!state.feedback&&(state.answerOpen||state.speaking);
    let response='';
    if(state.paused){response=`<div class="goe-paused"><h3>Продолжим, когда будешь готов</h3><p>Мы остановились на этом вопросе.</p>${button(`Продолжить ${icon('play')}`,'pause')}</div>`;}
    else if(state.feedback){response=`<div class="goe-feedback ${state.feedback==='retry'?'goe-correction':''}" role="status"><h3>${state.feedback==='good'?'Отлично, тебя легко понять!':'Смысл понятен. Давай чуть точнее.'}</h3><p>${state.feedback==='good'?'Такая фраза подходит в этом диалоге. Продолжим?':esc(step.explanation)}</p><p class="goe-correct-phrase">${esc(step.good)}</p></div>${state.feedback==='retry'?`<div class="goe-retry-actions">${button(`Попробую ещё раз ${icon('rotate-ccw')}`,'retry-answer')}${button(`${state.lessonIndex===steps.length-1?'Завершить урок':'Продолжить урок'} ${icon('arrow-right')}`,'next','goe-secondary')}</div>`:button(`${state.lessonIndex===steps.length-1?'Завершить урок':'Дальше'} ${icon('arrow-right')}`,'next')}`;}
    else if(state.answerOpen){response=`<div class="goe-response-panel"><h3>Пример твоего ответа</h3><p class="goe-muted">Выбери фразу и посмотри реакцию GOши.</p>${button(esc(step.good),'answer-good','goe-choice')}${button(esc(step.retry),'answer-retry','goe-choice')}</div>${button('Вернуться к вопросу','cancel-answer','goe-link')}`;}
    else{response=button(`${icon('mic')} Ответить голосом <span class="goe-mini-demo">Демо</span>`,'answer');}
    return `<div class="${state.compact?'goe-compact':''}"><header class="goe-lesson-header">${button(icon('x'),'home','goe-icon-button','aria-label="Закрыть урок"')}<h2>${topics[state.topic].short}</h2><span class="goe-lesson-count">${state.lessonIndex+1} / ${steps.length}</span></header><div class="goe-lesson-track" role="progressbar" aria-label="Ход урока" aria-valuenow="${state.lessonIndex+1}" aria-valuemin="0" aria-valuemax="${steps.length}"><span style="width:${(state.lessonIndex+1)/steps.length*100}%"></span></div><div class="goe-lesson-art">${characterFrame(mood.pose,mood.mode)}<span class="goe-state-label ${mood.tone}">${voiceActive?voiceBars(true):''}${mood.label}</span></div><main class="goe-lesson-body"><p class="goe-question-label">Ответь на вопрос</p><div class="goe-question" lang="en">${esc(step.prompt)}</div>${state.translation?`<p class="goe-translation">${esc(step.translation)}</p>`:''}${button(`${state.translation?'Скрыть перевод':'Показать перевод'} ${icon('chevron-right')}`,'translate','goe-link')}${state.hint?`<div class="goe-hint">${esc(step.hint)}</div>`:''}<div class="goe-lesson-tools">${button(`${icon('volume-2')} ${state.speaking?'Слушаем…':'Повторить'}`,'speak','goe-secondary',state.paused?'disabled':'')}${button(`${icon('lightbulb')} Подсказка`,'hint','goe-secondary',`aria-pressed="${state.hint}"`)}</div>${response}<div class="goe-lesson-footer">${button(`${icon(state.paused?'play':'pause')} ${state.paused?'Продолжить':'Пауза'}`,'pause','goe-secondary')}${button(`${icon('headphones')} ${state.compact?'Обычный вид':'Крупнее'}`,'compact','goe-secondary',`aria-pressed="${state.compact}"`)}</div><p class="goe-demo-note">Демо диалога · микрофон не включается</p></main></div>`;
  }
  function success(){return `${header()}<main class="goe-success"><div class="goe-success-art">${mascot('success','none')}<div class="goe-celebration-bits" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span><span></span></div></div><h1>Здорово, ${esc(state.name)}!</h1><p>Ещё один разговор на английском.<br>Ты потренировал знакомые фразы.</p><div class="goe-success-rewards"><div class="goe-reward-box">+60 XP за урок</div>${state.lastMissionBonus?'<div class="goe-reward-box">+40 XP за миссию</div>':''}</div>${button(`Мой прогресс ${icon('arrow-right')}`,'progress')}${button('Вернуться к урокам','home','goe-secondary')}<p class="goe-demo-note">Результаты этого примера сохраняются только в макете.</p></main>`;}
  function profile(){return `${header()}<main class="goe-content"><h1>Мой профиль</h1><div class="goe-profile-card"><label class="goe-field">Как тебя называть?<input class="goe-input" id="goe-name" name="name" autocomplete="given-name" maxlength="24" value="${esc(state.name)}"></label><label class="goe-field">Занятий в неделю<select class="goe-input" id="goe-goal">${[3,4,5].map(n=>`<option value="${n}" ${state.goal===n?'selected':''}>${n} ${lessonWord(n)} в неделю</option>`).join('')}</select></label><label class="goe-toggle"><input type="checkbox" id="goe-animation" ${state.animations?'checked':''}><span>Лёгкая анимация GOши</span></label></div>${button('Сохранить настройки','save-profile')}<div class="goe-profile-links">${button(`${icon('sparkles')} Ещё раз познакомиться с GOшей`,'welcome','goe-secondary')}${button(`Мой уровень: ${state.level} ${icon('chevron-right')}`,'level','goe-secondary')}</div></main>${navigation()}`;}
  function quiz(){
    if(state.quizDone)return `${header()}${backbar('Мой прогресс','progress')}<main class="goe-success"><div class="goe-success-art">${mascot(state.quizScore===3?'success':'explain','cheer')}</div><h1>${state.quizScore} из 3 — хороший шаг!</h1><p>Это короткая тренировка знакомых фраз.<br>Она не определяет уровень владения языком.</p><div style="margin-top:24px">${button('К моему прогрессу','progress')}</div></main>`;
    const q=quizzes[state.quizIndex];return `${header()}${backbar('Мой прогресс','progress')}<main class="goe-content"><p class="goe-muted">Тренировочная проверка · ${state.quizIndex+1} / 3</p><h1 style="font-size:26px;margin-top:20px">${q.question}</h1><div class="goe-quiz-choices">${q.options.map((s,i)=>button(esc(s),'quiz-choice','',`data-choice="${i}" aria-pressed="${state.quizChoice===i}" ${state.quizFeedback?'disabled':''}`)).join('')}</div>${state.quizFeedback?`<div class="goe-feedback ${state.quizChoice!==q.answer?'goe-correction':''}" role="status"><h3>${state.quizChoice===q.answer?'Верно!':'Разберём вместе'}</h3><p>${esc(q.note)}</p></div>${button(state.quizIndex===2?'Посмотреть результат':'Следующий вопрос','quiz-next')}`:button('Проверить ответ','quiz-check','goe-primary',state.quizChoice===null?'disabled':'')}</main>`;
  }
  function modal(){
    if(!state.modal)return '';
    const type=state.modal.type;let title='',content='';
    if(type==='capability'){
      const example=capabilityExamples[state.modal.index],mood=capabilityMood();
      title=caps[state.modal.index][1];
      content=`<div class="goe-capability-stage">${characterFrame(mood.pose,mood.mode)}<span class="goe-state-label">${mood.mode==='listening'||mood.mode==='speaking'?voiceBars(true):''}${mood.label}</span></div><p class="goe-capability-quote">${example.quote}</p><div class="goe-capability-example ${example.wrong?'goe-example-correction':''}">${example.wrong?`<p lang="en"><s>${example.wrong}</s></p>`:''}<p class="goe-example-english" lang="en">${example.wrong?icon('check'):''}${example.en}</p><p class="goe-example-translation">${example.ru}</p></div>${button(`${icon(state.speaking?'square':'volume-2')} ${state.speaking?'Остановить озвучку':'Послушать фразу'}`,'capability-audio','goe-secondary goe-example-audio')}${button(`Попробовать урок ${icon('arrow-right')}`,'goals')}<p class="goe-demo-note">Пример реакции · микрофон выключен</p>`;
    }
    if(type==='dictionary'){title='Мой словарь';content=`<p>Фразы из темы «В отеле».</p>${dictionary.map(([en,ru],i)=>`<div class="goe-dict-row"><div><strong lang="en">${en}</strong><p>${ru}</p></div>${button(icon('volume-2'),'word','goe-icon-button',`data-word="${i}" aria-label="Послушать ${en}"`)}</div>`).join('')}`;}
    if(type==='history'){title='История занятий';content=`${state.history.slice(0,3).map(entry=>`<div class="goe-history-item"><h3>Сегодня · ${topics[entry.topic].short}</h3><p>Разговорная практика · +${entry.reward} XP</p></div>`).join('')}<div class="goe-history-item"><h3>В отеле</h3><p>Вчера · 15 минут · +60 XP</p></div><div class="goe-history-item"><h3>Знакомство</h3><p>Позавчера · 15 минут · +60 XP</p></div>${button('Продолжить разговор','lesson')}`;}
    if(type==='exams'){title='Проверим знакомые фразы?';content=`<p>Три коротких задания по теме «В отеле». После каждого GOша объяснит ответ.</p><div style="display:flex;justify-content:center;height:135px">${mascot('hello','wave')}</div>${button('Начать тренировку','quiz-start')}`;}
    if(type==='level'){title='С какого уровня начнём?';content=`<p>Выбери комфортную сложность. Уровень можно изменить позже.</p><div class="goe-level-grid">${[['A1','Первые фразы'],['A2','Простое общение'],['B1','Уверенный разговор'],['B2','Свободнее в деталях']].map(([l,d])=>button(`${l}<span>${d}</span>`,'choose-level','goe-level-option',`data-level="${l}" aria-pressed="${state.level===l}"`)).join('')}</div><p class="goe-muted">В этом прототипе показаны примеры уроков A1.</p>${button('Продолжить','close-modal')}`;}
    if(type==='plan'){title='Твой ритм занятий';content=`<p>Выберем посильную цель на неделю.</p><label class="goe-field" style="margin-top:18px">Занятий в неделю<select class="goe-input" id="goe-plan-value">${[3,4,5].map(n=>`<option value="${n}" ${state.goal===n?'selected':''}>${n}</option>`).join('')}</select></label>${button('Сохранить план','save-plan')}`;}
    if(type==='reputation'){title='Бонусы к репутации';content=`<p>Здесь будут условия бонусов за участие в обучении. Ошибки в английском и пропущенные занятия не снижают репутацию.</p><p style="margin-top:14px">В прототипе бонусы не начисляются: сначала нужно согласовать правила.</p>${button('Понятно','close-modal')}`;}
    if(type==='skill'){title=state.modal.skill;content=`<p>Счётчик показывает выполненные задания. Это помогает следить за практикой по каждому навыку.</p><p style="margin-top:12px">Потренируемся на коротком диалоге?</p>${button('Открыть урок','lesson')}`;}
    return `<div class="goe-scrim" data-backdrop="true"><section class="goe-sheet" role="dialog" aria-modal="true" aria-labelledby="goe-dialog-title"><div class="goe-sheet-heading"><h2 id="goe-dialog-title">${title}</h2>${button(icon('x'),'close-modal','goe-icon-button','aria-label="Закрыть окно"')}</div>${content}</section></div>`;
  }
  function canAnimate(){return state.animations&&!reducedMotion.matches&&!!window.gsap;}
  function animateCharacter(frame,mode,previousPose){
    if(!frame)return;
    const g=window.gsap,character=frame.querySelector('.goe-mascot');
    if(!character)return;
    const pose=character.dataset.pose;
    if(previousPose&&previousPose!==pose){
      const ghost=document.createElement('div');
      ghost.className=`goe-mascot goe-pose-${previousPose} goe-none goe-pose-ghost`;
      ghost.setAttribute('aria-hidden','true');
      frame.appendChild(ghost);
      g.fromTo(character,{opacity:0},{opacity:1,duration:.23,ease:'power2.out'});
      g.to(ghost,{opacity:0,duration:.2,ease:'power2.out',onComplete:()=>ghost.remove()});
    }
    const motion=g.timeline({defaults:{ease:'sine.inOut'}});
    if(mode==='success')motion.to(character,{y:-8,rotation:-2,duration:.23}).to(character,{y:0,rotation:0,duration:.36});
    else if(mode==='thinking')motion.to(character,{rotation:-5,y:-2,duration:.28}).to(character,{rotation:0,y:0,duration:.42});
    else if(mode==='listening')motion.to(character,{rotation:-3,y:-3,duration:.28}).to(character,{rotation:0,y:0,duration:.42});
    else if(mode==='explain'||mode==='speaking'||mode==='teaching')motion.to(character,{x:3,rotation:2,duration:.25}).to(character,{x:0,rotation:0,duration:.38});
    else if(mode==='encourage')motion.to(character,{rotation:4,y:-3,duration:.24}).to(character,{rotation:-2,y:0,duration:.27}).to(character,{rotation:0,duration:.25});
    else if(mode==='rest')motion.to(character,{y:4,duration:.3}).to(character,{y:0,duration:.5});
    else if(!previousPose)motion.from(character,{y:8,opacity:0,duration:.42});
  }
  function animateScene(previous,replayWelcome){
    const g=window.gsap;
    const query=selector=>shell.querySelector(selector);
    const all=selector=>Array.from(shell.querySelectorAll(selector));
    const entered=!previous||previous.screen!==state.screen;
    const currentModal=state.modal?state.modal.type:null;
    const currentModalKey=currentModal?`${currentModal}:${state.modal.index??''}`:null;
    if(currentModal){
      const opened=!previous||previous.modalKey!==currentModalKey;
      if(opened){
        g.from(query('.goe-scrim'),{opacity:0,duration:.2,ease:'power2.out'});
        g.from(query('.goe-sheet'),{y:24,scale:.985,duration:.38,ease:'power3.out',clearProps:'transform'});
      }
      if(currentModal==='capability'){
        const mood=capabilityMood();
        if(opened||previous.modalMood!==mood.mode)animateCharacter(query('.goe-capability-stage .goe-character-frame'),mood.mode,opened?null:previous.modalPose);
      }
      return;
    }
    if(state.screen==='welcome'&&(entered||replayWelcome)){
      const character=query('.goe-mascot-trigger .goe-mascot');
      const timeline=g.timeline({defaults:{ease:'power3.out'}});
      timeline.from(query('.goe-welcome-halo'),{scale:.72,opacity:0,duration:.9},0)
        .fromTo(character,{y:30,scale:.86,rotation:-7,opacity:0},{y:0,scale:1,rotation:0,opacity:1,duration:.8,ease:'back.out(1.35)'},.02)
        .to(character,{rotation:4,duration:.2,ease:'sine.inOut'},.69)
        .to(character,{rotation:-2,duration:.24,ease:'sine.inOut'},.89)
        .to(character,{rotation:0,duration:.28,ease:'sine.out'},1.13)
        .from(all('.goe-welcome-spark'),{scale:.45,rotation:-18,opacity:0,stagger:.12,duration:.55,ease:'back.out(1.7)'},.25)
        .from(query('.goe-welcome h1'),{y:17,opacity:0,duration:.52},.25)
        .from(query('.goe-intro-name'),{y:13,opacity:0,duration:.52},.39)
        .from(query('.goe-intro-copy'),{y:10,opacity:0,duration:.48},.52)
        .from(all('.goe-intro-action'),{y:12,opacity:0,stagger:.09,duration:.45,clearProps:'transform'},.66)
        .from(query('.goe-intro-foot'),{y:6,opacity:0,duration:.4},.85);
      return;
    }
    if(state.screen==='lesson'){
      const mood=lessonMood();
      if(entered){
        g.from(query('.goe-lesson-body'),{y:10,opacity:0,duration:.36,ease:'power3.out',clearProps:'transform'});
        animateCharacter(query('.goe-lesson-art .goe-character-frame'),mood.mode,null);
      }else if(previous.mood!==mood.mode){
        animateCharacter(query('.goe-lesson-art .goe-character-frame'),mood.mode,previous.pose);
      }
      if(previous&&previous.screen==='lesson'&&previous.feedback!==state.feedback&&state.feedback){
        const feedback=query('.goe-feedback');
        if(feedback)g.from(feedback,{y:9,opacity:0,duration:.33,ease:'power3.out'});
      }
      if(previous&&previous.screen==='lesson'&&previous.lessonIndex!==state.lessonIndex){
        g.from(query('.goe-question'),{y:9,opacity:0,duration:.3,ease:'power3.out'});
        if(previous.topic===state.topic)g.fromTo(query('.goe-lesson-track span'),{width:`${(previous.lessonIndex+1)/lessonData[state.topic].length*100}%`},{width:`${(state.lessonIndex+1)/lessonData[state.topic].length*100}%`,duration:.42,ease:'power2.out'});
      }
      return;
    }
    if(state.screen==='success'&&entered){
      const character=query('.goe-success-art .goe-mascot');
      g.timeline().from(character,{y:12,scale:.94,opacity:0,duration:.32,ease:'power2.out'})
        .to(character,{y:-20,rotation:-4,duration:.26,ease:'power2.out'})
        .to(character,{y:0,rotation:0,duration:.46,ease:'back.out(1.2)'});
      const bits=all('.goe-celebration-bits span');
      const dx=[-90,-65,-112,91,110,67],dy=[-57,-96,8,-78,8,-113];
      g.timeline().fromTo(bits,{x:0,y:0,scale:.5,opacity:0},{x:i=>dx[i],y:i=>dy[i],scale:1,rotation:i=>(i%2?1:-1)*36,opacity:1,duration:.55,stagger:.035,ease:'power2.out'},.26)
        .to(bits,{y:'+=14',opacity:0,duration:.55,stagger:.02,ease:'sine.in'},.85);
      g.from(query('.goe-success h1'),{y:8,opacity:0,duration:.4,delay:.12});
      g.from(all('.goe-reward-box'),{scale:.97,y:5,opacity:0,duration:.4,stagger:.08,delay:.35,ease:'power3.out'});
      return;
    }
    if(entered){
      if(state.screen==='about'){
        g.from(query('.goe-about-title'),{y:10,opacity:0,duration:.4});
        g.from(all('.goe-capability'),{x:13,opacity:0,duration:.42,stagger:.065,delay:.08,ease:'power3.out'});
      }else if(state.screen==='goals'){
        g.from(query('main h1'),{y:12,opacity:0,duration:.35});
        g.from(all('.goe-goal'),{y:14,opacity:0,duration:.38,stagger:.055,delay:.06,ease:'power3.out',clearProps:'transform'});
      }else{
        const content=query('main');
        if(content)g.from(content,{y:12,opacity:0,duration:.35,ease:'power3.out',clearProps:'transform'});
      }
      return;
    }
    if(state.screen==='goals'&&previous&&previous.topic!==state.topic){
      g.from(query('.goe-goal[aria-pressed="true"]'),{scale:.985,duration:.3,ease:'back.out(1.3)',clearProps:'transform'});
    }
  }
  function render(options={}){
    const previous=renderSnapshot;
    clearTimeout(modalFocusTimer);
    const focused=document.activeElement;
    const focusedButton=focused&&root.contains(focused)&&focused.matches?.('button[data-action]')?{...focused.dataset}:null;
    const focusedAction=focused&&focused.closest&&focused.closest('[role="dialog"]')?focused.dataset.action:null;
    const focusedLevel=focusedAction&&focused.dataset.level;
    if(motionContext){motionContext.revert();motionContext=null;}
    const screens={welcome,about,goals,home,progress,league,lesson,success,profile,quiz};
    shell.classList.toggle('goe-motion',state.animations&&!reducedMotion.matches);
    root.classList.toggle('goe-gsap',!!window.gsap);
    shell.innerHTML=`${status()}<div ${state.modal?'inert':''}>${screens[state.screen]()}</div>${modal()}`;
    if(window.lucide&&typeof window.lucide.createIcons==='function')window.lucide.createIcons({attrs:{width:20,height:20,'stroke-width':1.65}});
    const mood=state.screen==='lesson'?lessonMood():null,exampleMood=capabilityMood();
    const modalKey=state.modal?`${state.modal.type}:${state.modal.index??''}`:null;
    renderSnapshot={screen:state.screen,modal:state.modal?state.modal.type:null,modalKey,modalMood:exampleMood?.mode,modalPose:exampleMood?.pose,feedback:state.feedback,lessonIndex:state.lessonIndex,topic:state.topic,mood:mood?.mode,pose:mood?.pose};
    if(canAnimate())motionContext=window.gsap.context(()=>{if(!options.skipMotion)animateScene(previous,!!options.replayWelcome);},shell);
    if(state.modal){
      const modalType=state.modal.type;
      const opened=!previous||previous.modalKey!==modalKey||previous.screen!==state.screen;
      if(opened||focusedAction)modalFocusTimer=setTimeout(()=>{
        if(!state.modal||`${state.modal.type}:${state.modal.index??''}`!==modalKey)return;
        const dialog=root.querySelector('[role="dialog"]');
        const candidates=dialog?Array.from(dialog.querySelectorAll('button')):[];
        const restored=!opened&&candidates.find(b=>b.dataset.action===focusedAction&&(!focusedLevel||b.dataset.level===focusedLevel));
        (restored||candidates[0])?.focus();
      },0);
    }else{
      const target=options.focusDataset||(options.focusAction?{action:options.focusAction}:previous?.screen===state.screen?focusedButton:null);
      if(target){
        const screen=state.screen;
        modalFocusTimer=setTimeout(()=>{
          if(state.screen!==screen||state.modal)return;
          const match=Array.from(root.querySelectorAll('button[data-action]')).find(b=>!b.disabled&&Object.entries(target).every(([key,value])=>b.dataset[key]===value));
          match?.focus();
        },0);
      }
    }
  }
  function announce(message){root.querySelector('#goe-announcement').textContent=message;}
  function toast(message){clearTimeout(toastTimer);root.querySelector('.goe-toast')?.remove();const n=document.createElement('div');n.className='goe-toast';n.setAttribute('role','status');n.textContent=message;shell.appendChild(n);toastTimer=setTimeout(()=>n.remove(),3300);}
  function cancelSpeech(){
    speechToken++;state.speaking=false;clearTimeout(speechTimer);
    audio.onplaying=audio.onended=audio.onerror=audio.onwaiting=null;
    audio.pause();audio.removeAttribute('src');audio.load();
  }
  function navigate(screen){cancelSpeech();state.screen=screen;state.modal=null;modalOrigin=null;if(screen!=='lesson')state.paused=false;render();}
  function startLesson(restart=false){cancelSpeech();state.modal=null;modalOrigin=null;state.screen='lesson';if(restart||state.lessonIndex>=lessonData[state.topic].length||state.lessonFinished)state.lessonIndex=0;state.lessonFinished=false;state.answerOpen=false;state.feedback=null;state.translation=false;state.hint=false;state.paused=false;render();}
  function openModal(value,trigger){cancelSpeech();modalOrigin=trigger?{...trigger.dataset}:null;state.modal=value;render();}
  function closeModal(){cancelSpeech();const origin=modalOrigin;modalOrigin=null;state.modal=null;render({focusDataset:origin});}
  function speak(text,showState=false){
    cancelSpeech();const token=speechToken;
    function finish(failed=false){
      if(token!==speechToken)return;
      cancelSpeech();if(showState)render();
      if(failed)toast('Не удалось воспроизвести запись. Попробуй ещё раз. Фраза остаётся на экране.');
    }
    const file=audioFiles[text];
    if(!file){finish(true);return;}
    audio.onplaying=()=>{if(token!==speechToken)return;clearTimeout(speechTimer);if(showState){state.speaking=true;render();}};
    audio.onended=()=>finish();
    audio.onerror=()=>finish(true);
    audio.onwaiting=()=>{clearTimeout(speechTimer);speechTimer=setTimeout(()=>finish(true),15000);};
    audio.src=new URL('assets/audio/'+file,document.baseURI).href;
    audio.onwaiting();
    audio.play().catch(()=>finish(true));
  }
  root.addEventListener('click',event=>{
    if(event.target.dataset.backdrop){closeModal();return;}
    const b=event.target.closest('button[data-action]');if(!b||!root.contains(b)||b.disabled||b.closest('[inert]'))return;
    const a=b.dataset.action;
    if(a==='replay-welcome'){render({replayWelcome:true});announce('Привет, '+state.name+'! Меня зовут GOша.');return;}
    if(['welcome','about','goals','home','progress','league','profile'].includes(a)){navigate(a);return;}
    if(a==='lesson'){startLesson();return;}
    if(a==='topic'){state.topic=b.dataset.topic;state.lessonIndex=0;state.lessonFinished=false;render();return;}
    if(a==='period'){state.period=b.dataset.period;render();return;}
    if(['dictionary','history','exams','level','plan','reputation'].includes(a)){openModal({type:a},b);return;}
    if(a==='skill'){openModal({type:'skill',skill:b.dataset.skill},b);return;}
    if(a==='capability'){const index=Number(b.dataset.capability);if(capabilityExamples[index])openModal({type:'capability',index},b);return;}
    if(a==='capability-audio'){if(state.modal?.type!=='capability')return;if(state.speaking){cancelSpeech();render();}else speak(capabilityExamples[state.modal.index].en,true);return;}
    if(a==='close-modal'){closeModal();return;}
    if(a==='choose-level'){state.level=b.dataset.level;render();return;}
    if(a==='save-plan'){state.goal=Number(root.querySelector('#goe-plan-value').value);closeModal();announce('План сохранён');return;}
    if(a==='save-profile'){const name=root.querySelector('#goe-name').value.trim();if(!name){toast('Напиши, как тебя называть.');root.querySelector('#goe-name').focus();return;}state.name=name;state.goal=Number(root.querySelector('#goe-goal').value);state.animations=root.querySelector('#goe-animation').checked;render();toast('Настройки сохранены');return;}
    if(a==='word'){speak(dictionary[Number(b.dataset.word)][0]);return;}
    if(a==='repeat-hotel'){state.topic='hotel';state.lessonIndex=2;state.lessonFinished=false;startLesson();return;}
    if(a==='translate'){state.translation=!state.translation;render();return;}
    if(a==='hint'){state.hint=!state.hint;render();return;}
    if(a==='speak'){speak(lessonData[state.topic][state.lessonIndex].prompt,true);return;}
    if(a==='answer'||a==='retry-answer'){cancelSpeech();state.answerOpen=true;state.feedback=null;render({focusAction:'answer-good'});announce(a==='retry-answer'?'Попробуй ещё раз. Выбери фразу.':'Выбери пример ответа');return;}
    if(a==='cancel-answer'){state.answerOpen=false;render({focusAction:'answer'});return;}
    if(a==='answer-good'||a==='answer-retry'){cancelSpeech();state.answerOpen=false;state.feedback=a==='answer-good'?'good':'retry';render({focusAction:state.feedback==='good'?'next':'retry-answer'});announce(state.feedback==='good'?'Получилось!':'GOша объясняет фразу');return;}
    if(a==='pause'){cancelSpeech();state.paused=!state.paused;render();return;}
    if(a==='compact'){state.compact=!state.compact;render();return;}
    if(a==='next'){if(state.screen!=='lesson'||state.lessonFinished||!state.feedback)return;cancelSpeech();if(state.lessonIndex>=lessonData[state.topic].length-1){state.lessonFinished=true;state.completed=true;state.sessionCount++;state.lastMissionBonus=state.missionAwarded?0:40;state.missionAwarded=true;state.xpValue+=60+state.lastMissionBonus;state.history.unshift({topic:state.topic,reward:60+state.lastMissionBonus});state.screen='success';}else{state.lessonIndex++;}state.answerOpen=false;state.feedback=null;state.translation=false;state.hint=false;render({focusAction:state.screen==='lesson'?'answer':'progress'});return;}
    if(a==='quiz-start'){state.quizIndex=0;state.quizChoice=null;state.quizFeedback=false;state.quizScore=0;state.quizDone=false;navigate('quiz');return;}
    if(a==='quiz-choice'){state.quizChoice=Number(b.dataset.choice);render();return;}
    if(a==='quiz-check'){if(state.quizChoice===null)return;state.quizFeedback=true;if(state.quizChoice===quizzes[state.quizIndex].answer)state.quizScore++;render();return;}
    if(a==='quiz-next'){if(state.quizIndex===quizzes.length-1)state.quizDone=true;else state.quizIndex++;state.quizChoice=null;state.quizFeedback=false;render();return;}
  });
  function buttonMotion(event,mode){
    if(!canAnimate()||!motionContext)return;
    const b=event.target.closest('.goe-primary,.goe-secondary');
    if(!b||!root.contains(b)||b.disabled||b.closest('[inert]'))return;
    if((mode==='over'||mode==='out')&&event.relatedTarget&&b.contains(event.relatedTarget))return;
    if((mode==='over'||mode==='out')&&event.pointerType==='touch')return;
    const hovered=mode==='over'||(mode==='up'&&event.pointerType!=='touch');
    const pressed=mode==='down';
    motionContext.add(()=>window.gsap.to(b,{
      y:pressed?1:hovered?-2:0,
      scale:pressed?.98:1,
      boxShadow:hovered&&b.classList.contains('goe-primary')?'0 8px 20px rgba(112,70,201,.17)':'0 0 0 rgba(112,70,201,0)',
      duration:pressed?.12:.22,
      ease:pressed?'power2.out':'power3.out',
      overwrite:'auto'
    }));
  }
  root.addEventListener('pointerover',event=>buttonMotion(event,'over'));
  root.addEventListener('pointerout',event=>buttonMotion(event,'out'));
  root.addEventListener('pointerdown',event=>buttonMotion(event,'down'));
  root.addEventListener('pointerup',event=>buttonMotion(event,'up'));
  root.addEventListener('pointercancel',event=>buttonMotion(event,'cancel'));
  if(typeof reducedMotion.addEventListener==='function')reducedMotion.addEventListener('change',()=>render({skipMotion:true}));
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&state.modal){closeModal();return;}
    if(event.key==='Tab'&&state.modal){const dialog=root.querySelector('[role="dialog"]');const items=Array.from(dialog.querySelectorAll('button:not([disabled]),input,select'));const first=items[0],last=items[items.length-1];if(event.shiftKey&&document.activeElement===first){last.focus();event.preventDefault();}else if(!event.shiftKey&&document.activeElement===last){first.focus();event.preventDefault();}}
  });
  addEventListener('pagehide',()=>{
    root.hidden=true; cancelSpeech(); clearTimeout(toastTimer); clearTimeout(modalFocusTimer);
    if(motionContext)motionContext.revert();
  });
  addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
  document.addEventListener('visibilitychange',async()=>{
    if(document.hidden){const wasSpeaking=state.speaking;cancelSpeech();if(wasSpeaking)render({skipMotion:true});root.hidden=true;return;}
    try{const current=await session();if(!current)return;if(current.id!==me.id||current.role!==me.role){location.reload();return;}root.hidden=false;}
    catch{root.hidden=false;unavailable();}
  });
  render();
})();
