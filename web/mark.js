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
    '@media (max-width:760px){.work__top{padding-right:72px}}';
  document.head.appendChild(css);

  document.body.appendChild(a);

  // Сворачивание бокового меню кабинетов: << у имени, >> в свёрнутом виде
  (function () {
    var shell = document.querySelector('.shell'), side = document.querySelector('.side');
    if (!shell || !side) return;
    var who = side.querySelector('.side__who');
    var name = who && who.querySelector('.side__name') ? who.querySelector('.side__name').textContent.trim() : '';
    if (who) who.setAttribute('data-initials', name.split(/\s+/).map(function (w) { return w[0] || ''; }).slice(0, 2).join('').toUpperCase());
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
