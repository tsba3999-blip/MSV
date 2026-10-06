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

  if(!document.querySelector('link[rel=icon]')){var icon=document.createElement('link');icon.rel='icon';icon.type='image/svg+xml';icon.href='favicon.svg';document.head.appendChild(icon);}
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
    '.msv-role-bar{position:fixed;left:0;right:0;top:0;z-index:10030;display:flex;align-items:center;gap:12px;flex-wrap:wrap;' +
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
    if (role === 'admin') {
      var adminSide = document.querySelector('.side');
      if (adminSide) adminSide.style.background = me.canEditSite ? 'linear-gradient(to bottom, var(--msv-graphite) 0%, #000 100%)' : 'linear-gradient(160deg, var(--msv-graphite) 0%, var(--msv-n500) 100%)';
    }
    if (role === 'resident' && page === 'menu.html') document.body.classList.add('resident-menu-gradient');

        // Original menu SVGs, preserved across pages with different navigation.
        var originalIcons = {
  "cabinet-staff.html": "<svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><rect x=\"4\" y=\"5\" width=\"16\" height=\"16\" rx=\"3\"/><path d=\"M8 3v4\"/><path d=\"M16 3v4\"/><path d=\"M9 14l2 2 4-4\"/></svg>",
  "http://104.171.138.117:3456/": "<svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M9 5H5v14h14v-4\"/><path d=\"M14 4h6v6\"/><path d=\"M20 4l-9 9\"/><path d=\"M6 15l2 2 4-4\"/></svg>",
  "staff-tickets.html": "<svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M4 6h16\"/><path d=\"M4 12h16\"/><path d=\"M4 18h10\"/></svg>",
  "staff-shahmatka.html": "<svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"2\"/><path d=\"M3 10h18\"/><path d=\"M9 10v9\"/></svg>",
  "staff-residents.html": "<svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"9\" cy=\"8\" r=\"3\"/><path d=\"M3 20a6 6 0 0 1 12 0\"/><path d=\"M16 6.5a3 3 0 0 1 0 5.8\"/><path d=\"M18 20a5.5 5.5 0 0 0-3-4.6\"/></svg>",
  "staff-salary.html": "<svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><rect x=\"3\" y=\"7\" width=\"18\" height=\"13\" rx=\"3\"/><path d=\"M3 10h18\"/><path d=\"M16 14.5h.01\"/><path d=\"M6 7V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1\"/></svg>",
  "staff-reputation.html": "<svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M12 4l2.4 5 5.6.8-4 3.9 1 5.5-5-2.7-5 2.7 1-5.5-4-3.9 5.6-.8z\"/></svg>",
  "staff-say.html": "<svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M20 5H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3v4l5-4h8a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z\"/></svg>",
  "staff-repair.html": "<svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M15 4a5 5 0 0 0-6.6 6.2L4 14.6V20h5.4l4.4-4.4A5 5 0 0 0 20 9l-3 3-3-3 3-3a5 5 0 0 0-2-2z\"/></svg>",
  "staff-mailings.html": "<svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M4 10v4h4l6 4V6l-6 4z\"/><path d=\"M18 9a4 4 0 0 1 0 6\"/></svg>",
  "staff-documents.html": "<svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z\"/><path d=\"M14 3v5h5\"/></svg>",
  "staff-profile.html": "<svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"8\" r=\"3.5\"/><path d=\"M5 20a7 7 0 0 1 14 0\"/></svg>",
  "staff-exams.html": "<svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M3 9l9-4 9 4-9 4z\"/><path d=\"M7 11v5c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5v-5\"/></svg>",
  "staff-settings.html": "<svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M12 3v2\"/><path d=\"M12 19v2\"/><path d=\"M4.5 7.5l1.7 1\"/><path d=\"M17.8 15.5l1.7 1\"/><path d=\"M4.5 16.5l1.7-1\"/><path d=\"M17.8 8.5l1.7-1\"/></svg>",
  "cabinet-admin.html": "<svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><rect x=\"4\" y=\"4\" width=\"7\" height=\"7\" rx=\"2\"/><rect x=\"13\" y=\"4\" width=\"7\" height=\"7\" rx=\"2\"/><rect x=\"4\" y=\"13\" width=\"7\" height=\"7\" rx=\"2\"/><rect x=\"13\" y=\"13\" width=\"7\" height=\"7\" rx=\"2\"/></svg>",
  "admin-staff.html": "<svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"9\" cy=\"8\" r=\"3\"/><path d=\"M3 20a6 6 0 0 1 12 0\"/><path d=\"M16 6.5a3 3 0 0 1 0 5.8\"/><path d=\"M18 20a5.5 5.5 0 0 0-3-4.6\"/></svg>",
  "admin-residences.html": "<svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M3 21h18\"/><path d=\"M5 21V8l7-4 7 4v13\"/><path d=\"M9 21v-6h6v6\"/><path d=\"M9 11h.01\"/><path d=\"M15 11h.01\"/></svg>",
  "admin-shahmatka.html": "<svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"2\"/><path d=\"M3 10h18\"/><path d=\"M9 10v9\"/></svg>",
  "admin-residents.html": "<svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"9\" cy=\"8\" r=\"3\"/><path d=\"M3 20a6 6 0 0 1 12 0\"/><path d=\"M16 6.5a3 3 0 0 1 0 5.8\"/><path d=\"M18 20a5.5 5.5 0 0 0-3-4.6\"/></svg>",
  "admin-tickets.html": "<svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><rect x=\"4\" y=\"5\" width=\"16\" height=\"16\" rx=\"3\"/><path d=\"M8 3v4\"/><path d=\"M16 3v4\"/><path d=\"M9 14l2 2 4-4\"/></svg>",
  "admin-reputation.html": "<svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M12 4l2.4 5 5.6.8-4 3.9 1 5.5-5-2.7-5 2.7 1-5.5-4-3.9 5.6-.8z\"/></svg>",
  "admin-rights.html": "<svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"8\" cy=\"15\" r=\"4\"/><path d=\"M11 12l8-8\"/><path d=\"M17 6l2 2\"/></svg>",
  "admin-settings.html": "<svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M12 3v2\"/><path d=\"M12 19v2\"/><path d=\"M4.5 7.5l1.7 1\"/><path d=\"M17.8 15.5l1.7 1\"/><path d=\"M4.5 16.5l1.7-1\"/><path d=\"M17.8 8.5l1.7-1\"/></svg>",
  "pin.html": "<svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"8\" cy=\"15\" r=\"4\"/><path d=\"M11 12l8-8\"/><path d=\"M17 6l2 2\"/></svg>"
};

    // One workspace for moderators without the separate payroll administrator role.
    if (role === 'moderator' && !me.canPayroll) {
      var aliases = {
        'staff-shahmatka.html': 'admin-shahmatka.html',
        'staff-residents.html': 'admin-residents.html',
        'staff-tickets.html': 'admin-tickets.html',
        'staff-reputation.html': 'admin-reputation.html',
        'admin-profile.html': 'staff-profile.html'
      };
      if (aliases[page]) { location.replace(aliases[page] + location.search + location.hash); return; }
      document.body.style.setProperty('--role', 'var(--msv-sky)');
      document.body.style.setProperty('--role-ink', 'var(--msv-graphite)');
      var moderatorSide = document.querySelector('.side');
      if (moderatorSide) moderatorSide.style.background = 'linear-gradient(160deg, var(--msv-graphite) 0%, var(--msv-sky) 100%)';
      var nav = document.querySelector('.side__nav');
      if (nav) {
        var items = [
          ['admin-shahmatka.html', 'Шахматка'],
          ['admin-residents.html', 'Резиденты'],
          ['admin-tickets.html', 'Все заявки'],
          ['cabinet-staff.html', 'Мои задачи'],
          ['cabinet-admin.html', 'Обзор'],
          ['admin-reputation.html', 'Репутация'],
          ['staff-mailings.html', 'Рассылки'],
          ['staff-salary.html', 'Моя зарплата'],
          ['staff-documents.html', 'Мои документы'],
          ['staff-profile.html', 'Мои данные'],
          ['staff-exams.html', 'Экзамены'],
          ['staff-say.html', 'Хочу сказать'],
          ['staff-repair.html', 'Заявка технику'],
          ['staff-settings.html', 'Настройки'],
          ['pin.html', 'Сменить код входа']
        ];
        var icons = {};
        var taskLink = nav.querySelector('a[target="_blank"]');
        if (taskLink) items.splice(4, 0, [taskLink.getAttribute('href'), taskLink.textContent.trim()]);
        nav.querySelectorAll('a').forEach(function (link) {
          var icon = link.querySelector('svg');
          if (icon) icons[link.getAttribute('href')] = icon.cloneNode(true);
        });
        nav.replaceChildren();
        items.forEach(function (item) {
          var link = document.createElement('a');
          link.className = 'side__link'; link.href = item[0];
          if (/^https?:/.test(item[0])) { link.target = '_blank'; link.rel = 'noopener'; }
          if (page === item[0]) link.setAttribute('aria-current', 'page');
          var icon = icons[item[0]] || icons[item[0].replace('admin-', 'staff-')];
          if (icon) link.appendChild(icon);
          else if (originalIcons[item[0]]) link.innerHTML = originalIcons[item[0]];
          link.appendChild(document.createTextNode(item[1]));
          if (document.querySelector('.shell--folded')) link.title = item[1];
          nav.appendChild(link);
        });
        var identity = document.querySelector('.side__who');
        if (identity) { identity.href = 'staff-profile.html'; identity.title = 'Мои данные'; }
      }
    }

    if (role === 'admin' || role === 'moderator') {
      var contractNav = document.querySelector('.side__nav');
      if (contractNav && !contractNav.querySelector('a[href="contracts-preview.html"]')) {
        var contractsLink = document.createElement('a');
        contractsLink.className = 'side__link'; contractsLink.href = 'contracts-preview.html';
        contractsLink.textContent = 'Подряды';
        var tasksLink = Array.from(contractNav.querySelectorAll('a')).find(function (link) { return /Задачи\s*M[²2]/.test(link.textContent); });
        if (tasksLink) tasksLink.after(contractsLink); else contractNav.appendChild(contractsLink);
      }
    }
    if (role === 'admin') {
      var ownerNav = document.querySelector('.side__nav');
      if (ownerNav && !ownerNav.querySelector('[data-resident-cabinet]')) {
        var residentCabinet = document.createElement('a');
        residentCabinet.className = 'side__link';
        residentCabinet.href = 'cabinet-resident.html';
        residentCabinet.setAttribute('data-resident-cabinet', '');
        residentCabinet.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>Кабинет резидента';
        ownerNav.appendChild(residentCabinet);
      }
    }
    // One icon for each section, including role-specific and legacy menus.
    document.querySelectorAll('a').forEach(function (link) {
      var href = (link.getAttribute('href') || '').split('?')[0];
      var handshake = href === 'contracts-preview.html';
      var statistics = href === 'cabinet-admin.html' && /Статистика|Обзор/.test(link.textContent);
      if (!handshake && !statistics) return;
      if (statistics) {
        Array.from(link.childNodes).forEach(function(n){if(n.nodeType===3 && n.textContent.trim())n.textContent=' Обзор';});
      }
      var oldIcon = link.querySelector('svg');
      var path = handshake
        ? '<path d="m2 12 4-7 4 2 3-2 5 2 4 6-3 3-4 4-3-1-3-2-3-3z"/><path d="m10 7-3 4 2 2 4-3 6 6M6 14l3-3M9 17l2-3M12 19l2-3"/>'
        : '<path d="M4 21v-3M9 21v-6M14 21v-4M19 21v-9M3 12l6-6 5 4 7-8M16 2h5v5"/>';
      var svg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + '</svg>';
      if (oldIcon) oldIcon.outerHTML = svg; else link.insertAdjacentHTML('afterbegin', svg);
    });
    if (role === 'staff' || role === 'moderator') {
      var personalNav = document.querySelector('.side__nav');
      if (personalNav && !personalNav.querySelector('.side__personal')) {
        personalNav.querySelectorAll('a[href="pin.html"]').forEach(function (link) { link.remove(); });
        var profile = personalNav.querySelector('a[href="staff-profile.html"]');
        if (!profile) {
          profile = document.createElement('a'); profile.className = 'side__link'; profile.href = 'staff-profile.html';
          profile.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>Мои данные';
          personalNav.appendChild(profile);
        }
        var group = document.createElement('div'); group.className = 'side__personal';
        var toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'side__link side__personal-toggle';
        toggle.innerHTML = profile.innerHTML + '<span class="side__personal-arrow" aria-hidden="true">⌄</span>';
        toggle.setAttribute('aria-controls', 'staffPersonalMenu');
        var submenu = document.createElement('div'); submenu.id = 'staffPersonalMenu'; submenu.className = 'side__personal-menu';
        profile.before(group); group.appendChild(toggle); group.appendChild(submenu);
        // Keep the profile page accessible when its former link becomes a disclosure.
        profile.childNodes.forEach(function (node) { if (node.nodeType === 3 && node.textContent.trim()) node.textContent = 'Личные данные'; });
        submenu.appendChild(profile);
        ['staff-documents.html', 'staff-exams.html', 'staff-reputation.html', 'admin-reputation.html'].forEach(function (href) {
          var link = personalNav.querySelector('a[href="' + href + '"]');
          if (!link && (href === 'staff-documents.html' || href === 'staff-exams.html')) {
            link = document.createElement('a'); link.className = 'side__link'; link.href = href;
            link.innerHTML = originalIcons[href] || '';
            link.appendChild(document.createTextNode(href === 'staff-documents.html' ? 'Мои документы' : 'Экзамены'));
          }
          if (link) submenu.appendChild(link);
        });
        function expand(open) { submenu.hidden = !open; toggle.setAttribute('aria-expanded', String(open)); }
        expand(!!submenu.querySelector('[aria-current="page"]'));
        toggle.addEventListener('click', function () {
          var folded = document.querySelector('.shell--folded .side__fold');
          if (folded) folded.click();
          expand(submenu.hidden);
        });
      }
    }
    var staffNav=document.querySelector('.side__nav');
    if(staffNav && role==='staff' && me.sectionAccess){
      [['chart','staff-shahmatka.html','Шахматка'],['residents','staff-residents.html','Резиденты'],['charges','admin-residents.html','Оплаты и депозиты'],['payroll','admin-staff.html','Начисления сотрудникам']].forEach(function(item){
        if(!me.sectionAccess[item[0]] || staffNav.querySelector('a[href="'+item[1]+'"]'))return;
        var link=document.createElement('a');link.className='side__link';link.href=item[1];link.dataset.section=item[0];link.innerHTML=(originalIcons[item[1]]||'');link.append(document.createTextNode(item[2]));staffNav.append(link);
      });
    }
    if(staffNav && role!=='resident' && !staffNav.querySelector('a[href="support.html"]')){var support=document.createElement('a');support.className='side__link';support.href='support.html';support.textContent='Поддержка';staffNav.append(support);}
    if(staffNav && me.sectionAccess && role!=='admin')staffNav.querySelectorAll('a').forEach(function(link){var href=link.getAttribute('href')||'',key=link.dataset.section||(/shahmatka/.test(href)?'chart':/residents/.test(href)?'residents':/charges/.test(href)?'charges':/tickets|repair/.test(href)?'tickets':/admin-staff.html/.test(href)?'payroll':null);if(key && me.sectionAccess[key]===false)link.hidden=true;});
    if(staffNav && ['admin','moderator'].includes(role) && (!me.sectionAccess||me.sectionAccess.residents)){var departures=document.createElement('a');departures.className='side__link';departures.href='admin-departures.html';departures.textContent='Заявки на выезд';staffNav.append(departures);}
    document.dispatchEvent(new Event('msv:menu-ready'));
    // «М» ведёт в свой кабинет
    a.href = ROLE_HOME[role] || 'menu.html';
    if (role === 'moderator' && !me.canPayroll) a.href = 'admin-shahmatka.html';
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
      /* Полоса закреплена сверху, а не просто стоит первой: страницы
         прокручиваются внутри своего блока, и «прилипающая» полоса
         уезжала вверх вместе с содержимым — человек её не видел и не
         понимал, почему не может править свои данные (25.09.2026). */
      var h = bar.offsetHeight;
      document.body.style.paddingTop = h + 'px';
      a.style.top = (14 + h) + 'px';
    }
  });

  /* Значок «фильтр» перед строкой отбора: чтобы она читалась как фильтр, а
     не как россыпь кнопок. Ставим сами на каждой странице, где такая строка
     появится — и на будущих тоже (решение заказчика 24.09.2026). */
  /* Значок фильтра больше не добавляем — просьба владельца от 04.10.2026. */
  Array.prototype.forEach.call(document.querySelectorAll('.bar__ico'), function (ico) { ico.remove(); });


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

(function(){var script=document.createElement('script');script.src='cabinet-preview.js';document.head.append(script);})();
(function(){var script=document.createElement('script');script.src='vendor-notices.js';document.head.append(script);})();
