/* © 2026 МСВ. Все права защищены. Программа для ЭВМ охраняется ст. 1259, 1261 ГК РФ. Использование без разрешения правообладателя запрещено. Подробнее: /legal.html */
/* ============================================================
   МСВ — правка содержимого на месте

   Подключается на любую страницу одной строкой:
     <script src="edit.js"></script>

   Если вошедший — администратор или модератор, в правом верхнем углу
   появляется карандаш. Нажатие включает правку: любой текст на
   странице можно исправить прямо на месте. «Сохранить» отправляет
   изменения на сервер, и с этого момента страница открывается уже
   с ними — для всех.

   Как это работает. Каждому изменённому элементу присваивается
   ключ — его путь в разметке от <body>. Сервер хранит пары
   «страница + ключ → новый текст». При загрузке скрипт запрашивает
   правки для этой страницы и подставляет их.

   Ограничение: если разметку страницы потом переделать, пути
   сдвинутся и старые правки лягут не туда. Поэтому после серьёзной
   правки вёрстки правки содержимого стоит пересмотреть.
   ============================================================ */

(function () {
  'use strict';

  var PAGE = location.pathname.split('/').pop() || 'index.html';
  var EDITABLE = 'h1, h2, h3, p, li, td, th, label > span, button, a, .msv-note, .tile__cap, .tile__label, .tile__due';
  var SKIP = '.msv-sh, .edit-bar, script, style, svg, input, textarea, select, [data-no-edit]';

  var state = { on: false, changed: {}, saving: false };
  var bar = null;

  /* ---------- Ключ элемента: путь от body ---------- */

  function keyOf(el) {
    var parts = [];
    var node = el;
    while (node && node !== document.body) {
      var parent = node.parentNode;
      var idx = Array.prototype.indexOf.call(parent.children, node);
      parts.unshift(node.tagName.toLowerCase() + ':' + idx);
      node = parent;
    }
    return parts.join('/');
  }

  function byKey(key) {
    var node = document.body;
    var parts = key.split('/');
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i].split(':');
      node = node.children[Number(p[1])];
      if (!node || node.tagName.toLowerCase() !== p[0]) return null;
    }
    return node;
  }

  /* ---------- Сеть ---------- */

  function api(method, url, body) {
    return fetch(url, {
      method: method, credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      return r.json().then(function (j) { return { status: r.status, body: j }; }, function () { return { status: r.status, body: {} }; });
    });
  }

  /* ---------- Применить сохранённые правки ---------- */

  function applySaved() {
    return api('GET', '/api/content?page=' + encodeURIComponent(PAGE)).then(function (r) {
      if (r.status !== 200 || !Array.isArray(r.body)) return;
      r.body.forEach(function (x) {
        var el = byKey(x.key);
        if (el) el.innerHTML = x.html;
      });
    }).catch(function () { /* сервера нет — страница открыта с диска */ });
  }

  /* ---------- Панель ---------- */

  function buildBar(role) {
    bar = document.createElement('div');
    bar.className = 'edit-bar';
    bar.innerHTML =
      '<button type="button" class="edit-bar__pen" data-edit="toggle" title="Править содержимое" aria-pressed="false">' +
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17z"/><path d="M13.5 6.5l3 3"/></svg>' +
      '</button>' +
      '<span class="edit-bar__meta" data-edit="meta" hidden></span>' +
      '<span class="edit-bar__tools" hidden>' +
        '<span class="edit-bar__hint">Правка: щёлкни текст и меняй. <b data-edit="count">0</b> изменений</span>' +
        '<button type="button" class="edit-bar__btn edit-bar__btn--save" data-edit="save">Сохранить</button>' +
        '<button type="button" class="edit-bar__btn" data-edit="cancel">Отмена</button>' +
      '</span>';
    document.body.appendChild(bar);

    bar.addEventListener('click', function (e) {
      var b = e.target.closest('[data-edit]');
      if (!b) return;
      if (b.dataset.edit === 'toggle') toggle();
      if (b.dataset.edit === 'save') save();
      if (b.dataset.edit === 'cancel') cancel();
    });

    var css = document.createElement('style');
    css.textContent =
      '.edit-bar{position:fixed;top:12px;right:12px;z-index:10050;display:flex;align-items:center;gap:8px;' +
        'font-family:var(--msv-font,sans-serif);font-size:13px}' +
      '.edit-bar__pen{width:40px;height:40px;display:flex;align-items:center;justify-content:center;' +
        'color:#34495E;background:#fff;border:1px solid #EAE4DA;border-radius:50%;cursor:pointer;' +
        'box-shadow:0 3px 9px rgba(52,73,94,.18)}' +
      '.edit-bar__pen:hover{background:#F5F1EA}' +
      '.edit-bar__pen[aria-pressed="true"]{color:#fff;background:#FB344A;border-color:#FB344A}' +
      '.edit-bar__meta{padding:6px 12px;background:#fff;color:#6B665E;border:1px solid #EAE4DA;border-radius:20px;' +
        'box-shadow:0 1px 5px rgba(52,73,94,.10);white-space:nowrap}' +
      '.edit-bar__meta[hidden]{display:none}' +
      '.edit-bar__meta b{color:#34495E;font-weight:600}' +
      '.edit-bar__tools{display:inline-flex;align-items:center;gap:8px;padding:6px 8px 6px 12px;background:#34495E;' +
        'color:#fff;border-radius:22px;box-shadow:0 3px 9px rgba(52,73,94,.18)}' +
      '.edit-bar__tools[hidden]{display:none}' +
      '.edit-bar__btn{height:30px;padding:0 12px;font:600 13px/1 inherit;color:#fff;background:rgba(255,255,255,.14);' +
        'border:0;border-radius:15px;cursor:pointer}' +
      '.edit-bar__btn--save{background:#C8F03C;color:#34495E}' +
      '.edit-bar__btn[disabled]{opacity:.5;cursor:default}' +
      'body.editing [contenteditable="true"]{outline:1px dashed rgba(251,52,74,.5);outline-offset:2px;cursor:text;min-height:1em}' +
      'body.editing [contenteditable="true"]:hover{outline-color:#FB344A;background:rgba(251,52,74,.04)}' +
      'body.editing [contenteditable="true"]:focus{outline:2px solid #FB344A;background:#fff}' +
      'body.editing .edit-changed{outline-color:#C8F03C!important}';
    document.head.appendChild(css);
  }

  /* Кто и когда правил эту страницу, сколько всего правок */
  function loadMeta() {
    return api('GET', '/api/content/meta?page=' + encodeURIComponent(PAGE)).then(function (r) {
      if (r.status !== 200 || !bar) return;
      var m = r.body;
      var el = bar.querySelector('[data-edit="meta"]');
      if (!m || !m.count) { el.hidden = true; return; }
      var when = m.lastAt ? new Date(m.lastAt) : null;
      var whenText = when ? (String(when.getDate()).padStart(2, '0') + '.' + String(when.getMonth() + 1).padStart(2, '0') + '.' + when.getFullYear() +
        ' ' + String(when.getHours()).padStart(2, '0') + ':' + String(when.getMinutes()).padStart(2, '0')) : '';
      el.innerHTML = 'Правок на странице: <b>' + m.count + '</b>' +
        (m.lastBy ? ' · последняя: <b>' + m.lastBy.replace(/</g, '&lt;') + '</b>' + (whenText ? ', ' + whenText : '') : '');
      el.hidden = false;
    }).catch(function () {});
  }

  /* ---------- Включить и выключить ---------- */

  function candidates() {
    return Array.prototype.filter.call(document.querySelectorAll(EDITABLE), function (el) {
      if (el.closest(SKIP)) return false;
      if (el.querySelector(EDITABLE)) return false;      // берём только самые внутренние
      return el.textContent.trim().length > 0;
    });
  }

  function toggle() {
    state.on ? cancel() : enable();
  }

  function enable() {
    state.on = true;
    state.changed = {};
    document.body.classList.add('editing');
    bar.querySelector('[data-edit="toggle"]').setAttribute('aria-pressed', 'true');
    bar.querySelector('.edit-bar__tools').hidden = false;

    candidates().forEach(function (el) {
      el.setAttribute('contenteditable', 'true');
      el.dataset.editOrig = el.innerHTML;
      el.addEventListener('input', onInput);
      // ссылки и кнопки в режиме правки не срабатывают
      el.addEventListener('click', block);
    });
    updateCount();
  }

  function disable() {
    state.on = false;
    document.body.classList.remove('editing');
    bar.querySelector('[data-edit="toggle"]').setAttribute('aria-pressed', 'false');
    bar.querySelector('.edit-bar__tools').hidden = true;
    Array.prototype.forEach.call(document.querySelectorAll('[contenteditable="true"]'), function (el) {
      el.removeAttribute('contenteditable');
      el.classList.remove('edit-changed');
      el.removeEventListener('input', onInput);
      el.removeEventListener('click', block);
      delete el.dataset.editOrig;
    });
  }

  function block(e) { if (state.on) { e.preventDefault(); e.stopPropagation(); } }

  function onInput(e) {
    var el = e.currentTarget;
    var key = keyOf(el);
    if (el.innerHTML !== el.dataset.editOrig) { state.changed[key] = el.innerHTML; el.classList.add('edit-changed'); }
    else { delete state.changed[key]; el.classList.remove('edit-changed'); }
    updateCount();
  }

  function updateCount() {
    var n = Object.keys(state.changed).length;
    bar.querySelector('[data-edit="count"]').textContent = n;
    bar.querySelector('[data-edit="save"]').disabled = n === 0 || state.saving;
  }

  function cancel() {
    Array.prototype.forEach.call(document.querySelectorAll('[contenteditable="true"]'), function (el) {
      if (el.dataset.editOrig !== undefined) el.innerHTML = el.dataset.editOrig;
    });
    disable();
  }

  function save() {
    var changes = Object.keys(state.changed).map(function (k) { return { key: k, html: state.changed[k] }; });
    if (!changes.length) return;

    if (DEMO) {
      alert('Это ознакомительный режим: страница открыта с диска, сервера нет.\n\n' +
            'На сервере эта же кнопка сохранит ' + changes.length + ' правок в базу, и страница откроется с ними у всех.');
      disable();
      return;
    }

    state.saving = true; updateCount();

    api('POST', '/api/content', { page: PAGE, changes: changes }).then(function (r) {
      state.saving = false;
      if (r.status !== 200) { alert(r.body.error || 'Не удалось сохранить'); updateCount(); return; }
      disable();
      loadMeta();
    }).catch(function () {
      state.saving = false; updateCount();
      alert('Сервер не отвечает. Изменения не сохранены.');
    });
  }

  /* ---------- Старт ---------- */

  /* Без сервера (страница открыта с диска) карандаш показываем в
     кабинетах администратора и сотрудника — чтобы было видно, как это
     работает. Сохранить нельзя: некуда. Об этом скажет сама кнопка. */
  /* Карандаш видит только владелец. Раньше его показывали всякому
     администратору и модератору, а на служебных страницах — вообще
     без проверки входа, по одному лишь имени файла. Править сам сайт —
     не работа модератора (решение заказчика 24.09.2026). */
  var DEMO = location.protocol === 'file:';

  if (!DEMO) {
    applySaved().then(function () {
      return api('GET', '/api/auth/me');
    }).then(function (r) {
      var me = r && r.status === 200 ? r.body : null;
      if (me && me.canEditSite) { buildBar(me.role); loadMeta(); }
    }).catch(function () {});
  }
})();
