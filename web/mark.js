/* © 2026 МСВ. Все права защищены. Подробнее: /legal.html */
/* ============================================================
   Красная кнопка «М» — всегда в правом верхнем углу кабинета

   Ведёт в меню своего кабинета: резиденту — в меню разделов,
   сотруднику и администратору — на главную своего кабинета.

   Знак берётся из файла favicon4.png (из брендбука). Пока файла нет,
   показывается временная плашка с буквой — она заменяется сама,
   как только файл появится в папке сайта.
   ============================================================ */

(function () {
  'use strict';

  var page = location.pathname.split('/').pop() || 'index.html';

  /* Кто вошёл — спрашиваем один раз на страницу, остальное считаем от
     ответа. Раньше каждый кусок спрашивал сам, а «М» вообще не спрашивала
     и вела по имени файла: администратор со страницы смены кода попадал
     в меню резидента (решение заказчика 25.09.2026). */
  var ROLE_NAME = { admin: 'Администратор', moderator: 'Модератор', staff: 'Сотрудник', resident: 'Резидент' };
  var ROLE_COLOR = { admin: '#34495E', moderator: '#7EB2DD', staff: '#B8B1A5', resident: '#FB344A' };
  var ROLE_HOME = { admin: 'cabinet-admin.html', moderator: 'staff-shahmatka.html', staff: 'cabinet-staff.html', resident: 'menu.html' };
  var ROLE_SELF = { admin: 'admin-profile.html', moderator: 'staff-profile.html', staff: 'staff-profile.html', resident: 'mydata.html' };
  var meReq = location.protocol === 'file:' ? Promise.resolve(null)
    : fetch('/api/auth/me', { credentials: 'same-origin' })
        .then(function (r) { return r.status === 200 ? r.json() : null; })
        .catch(function () { return null; });

  // на первой странице, входе и правовой странице кнопке не место
  if (/^(index|login|signup|partner|legal)\.html$/.test(page)) return;

  var home;
  if (/^(admin-|cabinet-admin)/.test(page)) home = 'cabinet-admin.html';
  else if (/^(staff-|cabinet-staff)/.test(page)) home = 'cabinet-staff.html';
  else home = 'menu.html';

  var a = document.createElement('a');
  a.className = 'msv-mark-btn' + (home === 'cabinet-staff.html' ? ' msv-mark-btn--staff' : (home === 'cabinet-admin.html' ? ' msv-mark-btn--admin' : ''));
  a.href = home;
  a.setAttribute('aria-label', 'Меню');
  a.title = 'Меню';

  var img = document.createElement('img');
  img.src = 'favicon4.png';
  img.alt = '';
  img.width = 28; img.height = 28;
  img.onerror = function () {
    // файла нет — временная плашка
    a.classList.add('msv-mark-btn--ph');
    a.textContent = 'М';
  };
  a.appendChild(img);

  var css = document.createElement('style');
  css.textContent =
    '.msv-mark-btn{position:fixed;top:14px;right:14px;z-index:10040;display:flex;align-items:center;justify-content:center;' +
      'width:44px;height:44px;border-radius:12px;background:#fff;box-shadow:0 3px 9px rgba(52,73,94,.18);text-decoration:none;' +
      'transition:transform .09s cubic-bezier(.2,0,0,1)}' +
    '.msv-mark-btn--staff{background:#7EB2DD}.msv-mark-btn--admin{background:#34495E}' +
    '.msv-mark-btn:hover{transform:translateY(-1px)}' +
    '.msv-mark-btn:active{transform:scale(.97)}' +
    '.msv-mark-btn:focus-visible{outline:2px solid #6E3BFF;outline-offset:2px}' +
    '.msv-mark-btn img{display:block;width:28px;height:28px;object-fit:contain}' +
    '.msv-mark-btn--ph{background:#FB344A;color:#fff;font:700 18px/1 var(--msv-font,sans-serif);transform:skewX(-14deg)}' +
    '.msv-mark-btn--ph:hover{transform:skewX(-14deg) translateY(-1px)}' +
    /* карандаш редактора сдвигаем левее, чтобы не наезжал */
    '.edit-bar{right:70px!important}' +
    /* на страницах резидента шапка узкая — освобождаем место справа */
    '.page .head,.app .top{padding-right:56px}' +
    /* в кабинете сотрудника справа в шапке стоят знаки резиденций —
       отводим место под «М» и карандаш, иначе они накладываются */
    '.work__top{padding-right:132px}' +
    '@media (max-width:760px){.work__top{padding-right:72px}}' +
    /* значок «фильтр» перед строкой отбора */
    '.bar__ico{flex:0 0 auto;display:inline-flex;align-items:center;color:var(--msv-n500)}' +
    /* полоса «вы здесь не резидент» */
    '.msv-role-bar{position:sticky;top:0;z-index:10030;display:flex;align-items:center;gap:12px;flex-wrap:wrap;' +
      'padding:8px 60px 8px 16px;color:#fff;font:500 13px/1.35 var(--msv-font,sans-serif)}' +
    '.msv-role-bar a{color:#fff;text-decoration:underline;text-underline-offset:2px;white-space:nowrap}' +
    '.msv-role-bar b{font-weight:700}';
  document.head.appendChild(css);

  document.body.appendChild(a);

  /* ---------- Цвет роли ----------
     Заказчик: «перекрасить кабинет в мой цвет, чтобы я видел, что я
     админ». Красим то, что человек видит на каждой странице: кнопку «М»,
     кружок с лицом и подпись под именем. Цвета уже были у кнопки «М» —
     берём их, чтобы роль читалась одинаково везде (25.09.2026). */
  meReq.then(function (me) {
    if (!me) return;
    var role = me.role || 'resident';
    document.documentElement.setAttribute('data-role', role);

    // «М» ведёт в свой кабинет
    a.href = ROLE_HOME[role] || 'menu.html';
    a.classList.remove('msv-mark-btn--staff', 'msv-mark-btn--admin');
    if (role === 'admin') a.classList.add('msv-mark-btn--admin');
    else if (role === 'moderator' || role === 'staff') a.classList.add('msv-mark-btn--staff');

    // Кружок: фото, а без него — буквы на цвете роли
    var face = document.querySelector('.who__face');
    if (face) {
      if (me.photo) {
        face.style.backgroundImage = 'url("' + me.photo + '")';
        face.style.backgroundSize = 'cover';
        face.style.backgroundPosition = 'center';
        face.textContent = '';
      } else {
        face.style.background = ROLE_COLOR[role] || '';
        face.style.color = '#fff';
      }
    }

    /* Подпись под именем. Резиденту — его место, остальным — должность:
       «место ещё не выбрано» администратору ничего не говорит. */
    var place = document.querySelector('.who__place');
    if (place && role !== 'resident') place.textContent = me.position || ROLE_NAME[role] || role;

    /* Кабинет резидента глазами не резидента. Не прячем страницу — она
       нужна, чтобы посмотреть, что видит жилец, — но говорим прямо, чей
       это кабинет и где свой. Иначе выходит, что главный администратор
       «не может себя редактировать» (решение заказчика 25.09.2026). */
    var residentPage = !/^(admin-|staff-|cabinet-admin|cabinet-staff)/.test(page);
    if (residentPage && role !== 'resident') {
      var bar = document.createElement('div');
      bar.className = 'msv-role-bar';
      bar.style.background = ROLE_COLOR[role] || '#34495E';
      bar.innerHTML = '<span>Вы вошли как <b>' + (me.position || ROLE_NAME[role] || role) +
        '</b>. Это кабинет резидента — так его видит жилец.</span>' +
        '<a href="' + (ROLE_SELF[role] || 'menu.html') + '">Мой профиль</a>' +
        '<a href="' + (ROLE_HOME[role] || 'menu.html') + '">Мой кабинет</a>';
      document.body.insertBefore(bar, document.body.firstChild);
      document.body.classList.add('msv-has-role-bar');
    }
  });

  /* Значок «фильтр» перед строкой отбора: чтобы она читалась как фильтр, а
     не как россыпь кнопок. Ставим сами на каждой странице, где такая строка
     появится — и на будущих тоже (решение заказчика 24.09.2026). */
  Array.prototype.forEach.call(document.querySelectorAll('.bar'), function (bar) {
    if (!bar.querySelector('.bar__search, .bar__chip')) return;   // строка не про отбор
    if (bar.querySelector('.bar__ico')) return;
    var ico = document.createElement('span');
    ico.className = 'bar__ico';
    ico.title = 'Фильтр';
    ico.setAttribute('aria-hidden', 'true');
    ico.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16l-6.5 7.5V19L10.5 21v-8.5z"/></svg>';
    bar.insertBefore(ico, bar.firstChild);
  });

  // Сворачивание бокового меню кабинетов: << у имени, >> в свёрнутом виде
  (function () {
    var shell = document.querySelector('.shell'), side = document.querySelector('.side');
    if (!shell || !side) return;
    var who = side.querySelector('.side__who');

    /* Имя в боковом меню было зашито в вёрстку — у всех стояла «Ирина
       Соколова», кто бы ни вошёл. Берём настоящее из учётной записи
       (решение заказчика 24.09.2026). */
    function setInitials() {
      if (!who) return;
      var n = who.querySelector('.side__name');
      var nm = n ? n.textContent.trim() : '';
      who.setAttribute('data-initials',
        nm.split(/\s+/).map(function (w) { return w[0] || ''; }).slice(0, 2).join('').toUpperCase());
    }
    setInitials();

    if (who) {
      meReq.then(function (me) {
        if (!me) return;
        var n = who.querySelector('.side__name');
        var r = who.querySelector('.side__role');
        if (n && me.name) n.textContent = me.name;
        /* Подписываем должностью, если она указана: у двух
           администраторов подписи разные (25.09.2026) */
        if (r) r.textContent = me.position || ROLE_NAME[me.role] || me.role;
        setInitials();
        /* Своё лицо в боковом меню. Кружок рисует ::before, картинку
           передаём ему переменной: в CSS нельзя подставить адрес из
           атрибута (25.09.2026). */
        who.style.setProperty('--face-color', ROLE_COLOR[me.role] || 'rgba(255,255,255,.18)');
        if (me.photo) {
          who.style.setProperty('--face', 'url("' + me.photo + '")');
          who.setAttribute('data-photo', '1');
        }
      });
    }
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'side__fold'; btn.setAttribute('aria-label', 'Свернуть меню'); btn.title = 'Свернуть меню';
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 6l-6 6 6 6"/><path d="M18 6l-6 6 6 6"/></svg>';
    side.appendChild(btn);
    // Стрелка стоит напротив имени сотрудника (в свёрнутом меню — сверху)
    function place() { if (!who || shell.classList.contains('shell--folded')) { btn.style.top = ''; return; } btn.style.top = (who.offsetTop + who.offsetHeight / 2 - 14) + 'px'; }
    function apply(folded) {
      shell.classList.toggle('shell--folded', folded);
      place();
      btn.setAttribute('aria-label', folded ? 'Развернуть меню' : 'Свернуть меню'); btn.title = btn.getAttribute('aria-label');
      side.querySelectorAll('.side__link').forEach(function (l) { if (folded) l.title = l.textContent.trim(); else l.removeAttribute('title'); });
    }
    var saved = false; try { saved = localStorage.getItem('msv.sideFolded') === '1'; } catch (e) {}
    apply(saved);
    window.addEventListener('resize', place);
    btn.addEventListener('click', function () {
      var f = !shell.classList.contains('shell--folded'); apply(f);
      try { localStorage.setItem('msv.sideFolded', f ? '1' : '0'); } catch (e) {}
    });
  })();

  // Выход из кабинета: сначала закрываем сессию на сервере
  document.addEventListener('click', function (e) {
    var out = e.target.closest('[data-logout]');
    if (!out || location.protocol === 'file:') return;
    e.preventDefault();
    fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
      .then(function () { location.href = 'index.html'; }, function () { location.href = 'index.html'; });
  });
})();

/* ============================================================
   «Вернуться» ведёт туда, откуда пришли

   В разметке у кнопки прописан запасной адрес — он остаётся для случая,
   когда страницу открыли по прямой ссылке или из поиска. Но если резидент
   пришёл с другой страницы сайта (например, на «Правила» — с «Проверки
   данных»), кнопка возвращает именно туда (решение заказчика 23.09.2026).
   ============================================================ */
(function () {
  'use strict';
  var back = document.querySelector('.head__back'); if (!back) return;
  var ref = document.referrer; if (!ref) return;

  var u; try { u = new URL(ref); } catch (e) { return; }
  if (u.origin !== location.origin) return;            // пришли с чужого сайта
  if (u.pathname === location.pathname) return;        // перезагрузка этой же страницы

  var from = u.pathname.split('/').pop() || 'index.html';
  // со входа и с выхода возвращать некуда
  if (/^(login|signup)\.html$/.test(from)) return;

  back.href = u.pathname + u.search;
})();
