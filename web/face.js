/* © 2026 МСВ. Все права защищены. Подробнее: /legal.html */
/* ============================================================
   Своё фото в профиле

   Кружок с двумя буквами узнаётся плохо, особенно когда в кабинет
   заходят несколько человек с одной машины. Человек ставит своё фото
   и видит, что кабинет его (решение заказчика 25.09.2026).

   Работает на любой роли: резидент, сотрудник, модератор, админ —
   фото хранится в учётной записи, а не в анкете резидента.

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

  var css = document.createElement('style');
  css.textContent =
    '.face{display:flex;align-items:center;gap:var(--msv-s16);flex-wrap:wrap}' +
    '.face__pic{flex:0 0 auto;display:flex;align-items:center;justify-content:center;width:96px;height:96px;' +
      'border-radius:50%;background:var(--msv-n100);color:var(--msv-white);font:700 28px/1 var(--msv-font,sans-serif);' +
      'background-size:cover;background-position:center;overflow:hidden}' +
    '.face__act{display:flex;align-items:center;gap:var(--msv-s8);flex-wrap:wrap}' +
    '.face__act .msv-note{flex:1 0 100%;margin:0;color:var(--msv-n500)}';
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

  fetch('/api/auth/me', { credentials: 'same-origin' })
    .then(function (r) { return r.status === 200 ? r.json() : null; })
    .then(function (me) { if (me) show(me.photo, me.name, me.role); })
    .catch(function () {});

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
    if (file.size > 8 * 1024 * 1024) return say('Файл больше 8 МБ — выберите поменьше', true);

    say('Загружаю…');
    pick.disabled = true;
    fetch('/api/me/photo', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file
    })
      .then(function (r) { return r.json().then(function (j) { return { s: r.status, j: j }; }); })
      .then(function (out) {
        pick.disabled = false;
        if (out.s !== 201) return say(out.j.error || 'Не удалось загрузить', true);
        show(out.j.url, '', '');
        say('Готово. Фото видно в кабинете.');
      })
      .catch(function () { pick.disabled = false; say('Сеть не отвечает', true); });
  });

  if (drop) drop.addEventListener('click', function () {
    fetch('/api/me/photo', { method: 'DELETE', credentials: 'same-origin' })
      .then(function () {
        return fetch('/api/auth/me', { credentials: 'same-origin' }).then(function (r) { return r.json(); });
      })
      .then(function (me) { show('', me.name, me.role); say(hint); })
      .catch(function () { say('Сеть не отвечает', true); });
  });
})();
