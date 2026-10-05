/* © 2026 МСВ. Все права защищены. Подробнее: /legal.html */
/* ============================================================
   Своё фото в профиле

   Кружок с двумя буквами узнаётся плохо, особенно когда в кабинет
   заходят несколько человек с одной машины. Человек ставит своё фото
   и видит, что кабинет его (решение заказчика 25.09.2026).

   Работает на любой роли: резидент, сотрудник, модератор, админ —
   фото хранится в учётной записи, а не в анкете резидента.

   Перед тем как поставить, снимок можно подвинуть и приблизить: с
   телефона кадр почти всегда шире лица, и без этого в кружок попадал
   то лоб, то плечо (решение заказчика 25.09.2026). Обрезанное
   отправляем квадратом 512×512 — на сервер уходит не десять мегабайт
   с телефона, а сотня килобайт.

   Страница даёт разметку:
     <span class="face__pic" id="myFace"></span>
     <button id="facePick">…</button>  <button id="faceDrop">…</button>
     <p id="faceMsg">…</p>
   ============================================================ */

(function () {
  'use strict';

  var pic = document.getElementById('myFace');
  var pick = document.getElementById('facePick');
  if (!pic || !pick || location.protocol === 'file:') return;

  var drop = document.getElementById('faceDrop');
  var msg = document.getElementById('faceMsg');
  var hint = msg ? msg.textContent : '';

  var OUT = 512;        // сторона готового снимка
  var BOX = 260;        // сторона окошка кадрирования

  var css = document.createElement('style');
  css.textContent =
    '.face{display:flex;align-items:center;gap:var(--msv-s16);flex-wrap:wrap}' +
    '.face__pic{flex:0 0 auto;display:flex;align-items:center;justify-content:center;width:96px;height:96px;' +
      'border-radius:50%;background:var(--msv-n100);color:var(--msv-white);font:700 28px/1 var(--msv-font,sans-serif);' +
      'background-size:cover;background-position:center;overflow:hidden}' +
    '.face__act{display:flex;align-items:center;gap:var(--msv-s8);flex-wrap:wrap}' +
    '.face__act .msv-note{flex:1 0 100%;margin:0;color:var(--msv-n500)}' +

    /* окно кадрирования */
    '.crop{position:fixed;inset:0;z-index:10050;display:flex;align-items:center;justify-content:center;padding:16px;' +
      'background:rgba(16,22,31,.55);font-family:var(--msv-font,sans-serif)}' +
    '.crop__box{width:100%;max-width:340px;padding:20px;background:var(--msv-white,#fff);border-radius:16px;' +
      'box-shadow:0 12px 40px rgba(16,22,31,.3);color:var(--msv-graphite,#34495E);text-align:center}' +
    '.crop__title{margin:0 0 4px;font-size:16px;font-weight:600}' +
    '.crop__hint{margin:0 0 14px;font-size:12px;line-height:1.35;color:var(--msv-n500,#6B665E)}' +
    '.crop__stage{position:relative;width:' + BOX + 'px;height:' + BOX + 'px;margin:0 auto;border-radius:50%;' +
      'overflow:hidden;background:var(--msv-n100,#EAE4DA);cursor:grab;touch-action:none;user-select:none}' +
    '.crop__stage--drag{cursor:grabbing}' +
    '.crop__img{position:absolute;left:0;top:0;transform-origin:0 0;pointer-events:none;-webkit-user-drag:none}' +
    '.crop__zoom{display:flex;align-items:center;gap:10px;margin:14px 0 16px}' +
    '.crop__zoom input{flex:1 1 auto;accent-color:var(--msv-red,#FB344A)}' +
    '.crop__zoom span{font-size:12px;color:var(--msv-n500,#6B665E)}' +
    '.crop__act{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}';
  document.head.appendChild(css);

  function say(text, bad) {
    if (!msg) return;
    msg.textContent = text;
    msg.style.color = bad ? 'var(--msv-red)' : 'var(--msv-n500)';
  }

  function show(url, name, role) {
    if (url) {
      pic.style.backgroundImage = 'url("' + url + '")';
      pic.textContent = '';
    } else {
      pic.style.backgroundImage = '';
      var parts = String(name || '').split(/\s+/).filter(Boolean);
      pic.textContent = (parts.length >= 2 ? parts[0][0] + parts[1][0] : String(name || '').slice(0, 2)).toUpperCase();
      /* Пустой кружок красим в цвет роли — тот же, что у кнопки «М» */
      pic.style.background = ({ admin: '#34495E', moderator: '#7EB2DD', staff: '#B8B1A5', resident: '#FB344A' })[role] || 'var(--msv-n300)';
    }
    if (drop) drop.hidden = !url;
  }

  var me = null;
  function loadMe() {
    return fetch('/api/auth/me', { credentials: 'same-origin' })
      .then(function (r) { return r.status === 200 ? r.json() : null; })
      .then(function (m) { me = m; if (m) show(m.photo, m.name, m.role); })
      .catch(function () {});
  }
  loadMe();

  /* ---------- Выбор файла ---------- */

  var picker = document.createElement('input');
  picker.type = 'file';
  picker.accept = 'image/jpeg,image/png,image/webp,image/gif';
  picker.style.display = 'none';
  document.body.appendChild(picker);

  pick.addEventListener('click', function () { picker.click(); });

  picker.addEventListener('change', function () {
    var file = picker.files && picker.files[0];
    picker.value = '';
    if (!file) return;
    /* Проверку размера делаем и здесь: восемь мегабайт по мобильной сети
       грузятся долго, а отказ придёт только в конце */
    if (file.size > 20 * 1024 * 1024) return say('Снимок больше 20 МБ — выберите поменьше', true);

    window.MSVCrop(file).then(function(blob){if(blob)send(blob);}).catch(function(e){say(e.message,true);});
  });

  /* ---------- Кадрирование ---------- */

  /* ---------- Отправка ---------- */

  function send(blob) {
    say('Загружаю…');
    pick.disabled = true;
    fetch('/api/me/photo', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'image/jpeg' },
      body: blob
    })
      .then(function (r) { return r.json().then(function (j) { return { s: r.status, j: j }; }); })
      .then(function (out) {
        pick.disabled = false;
        if (out.s !== 201) return say(out.j.error || 'Не удалось загрузить', true);
        show(out.j.url, '', '');
        say('Готово. Фото видно в кабинете.');
      })
      .catch(function () { pick.disabled = false; say('Сеть не отвечает', true); });
  }

  if (drop) drop.addEventListener('click', function () {
    fetch('/api/me/photo', { method: 'DELETE', credentials: 'same-origin' })
      .then(function () { return loadMe(); })
      .then(function () { say(hint); })
      .catch(function () { say('Сеть не отвечает', true); });
  });
})();
