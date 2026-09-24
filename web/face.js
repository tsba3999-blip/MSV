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

    var reader = new FileReader();
    reader.onerror = function () { say('Не удалось прочитать файл', true); };
    reader.onload = function () {
      var img = new Image();
      img.onerror = function () { say('Это не похоже на изображение', true); };
      img.onload = function () { openCrop(img); };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

  /* ---------- Кадрирование ---------- */

  function openCrop(img) {
    var wrap = document.createElement('div');
    wrap.className = 'crop';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.innerHTML =
      '<div class="crop__box">' +
        '<h3 class="crop__title">Как это будет выглядеть</h3>' +
        '<p class="crop__hint">Потяните снимок, чтобы подвинуть. Ползунком или колесом мыши — приблизить.</p>' +
        '<div class="crop__stage"><img class="crop__img" alt=""></div>' +
        '<div class="crop__zoom"><span>−</span>' +
          '<input type="range" min="100" max="400" value="100" aria-label="Приблизить">' +
        '<span>+</span></div>' +
        '<div class="crop__act">' +
          '<button type="button" class="msv-btn msv-btn--m msv-btn--secondary" data-act="cancel">Отмена</button>' +
          '<button type="button" class="msv-btn msv-btn--m msv-btn--primary" data-act="ok">Поставить фото</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(wrap);

    var stage = wrap.querySelector('.crop__stage');
    var shown = wrap.querySelector('.crop__img');
    var range = wrap.querySelector('input[type="range"]');
    shown.src = img.src;

    /* Наименьший масштаб — такой, чтобы снимок закрывал круг целиком:
       иначе в кадре появятся пустые углы. */
    var base = BOX / Math.min(img.naturalWidth, img.naturalHeight);
    var zoom = 1, ox = 0, oy = 0;

    function draw() {
      var w = img.naturalWidth * base * zoom;
      var h = img.naturalHeight * base * zoom;
      /* Держим снимок так, чтобы круг всегда был закрыт */
      ox = Math.min(0, Math.max(BOX - w, ox));
      oy = Math.min(0, Math.max(BOX - h, oy));
      shown.style.width = w + 'px';
      shown.style.height = h + 'px';
      shown.style.transform = 'translate(' + ox + 'px,' + oy + 'px)';
    }

    // по центру
    zoom = 1;
    ox = (BOX - img.naturalWidth * base) / 2;
    oy = (BOX - img.naturalHeight * base) / 2;
    draw();

    range.addEventListener('input', function () {
      var next = Number(range.value) / 100;
      /* Приближаем к середине круга, а не к левому верхнему углу —
         иначе при каждом движении ползунка лицо уезжает из кадра */
      var k = next / zoom;
      ox = BOX / 2 - (BOX / 2 - ox) * k;
      oy = BOX / 2 - (BOX / 2 - oy) * k;
      zoom = next;
      draw();
    });

    stage.addEventListener('wheel', function (e) {
      e.preventDefault();
      var next = Math.min(4, Math.max(1, zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
      var k = next / zoom;
      ox = BOX / 2 - (BOX / 2 - ox) * k;
      oy = BOX / 2 - (BOX / 2 - oy) * k;
      zoom = next;
      range.value = Math.round(zoom * 100);
      draw();
    }, { passive: false });

    var drag = null;
    stage.addEventListener('pointerdown', function (e) {
      drag = { x: e.clientX, y: e.clientY, ox: ox, oy: oy };
      stage.setPointerCapture(e.pointerId);
      stage.classList.add('crop__stage--drag');
    });
    stage.addEventListener('pointermove', function (e) {
      if (!drag) return;
      ox = drag.ox + (e.clientX - drag.x);
      oy = drag.oy + (e.clientY - drag.y);
      draw();
    });
    ['pointerup', 'pointercancel'].forEach(function (t) {
      stage.addEventListener(t, function () { drag = null; stage.classList.remove('crop__stage--drag'); });
    });

    function close() { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); }

    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
    });

    wrap.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-act]');
      if (e.target === wrap || (btn && btn.dataset.act === 'cancel')) { close(); return; }
      if (!btn || btn.dataset.act !== 'ok') return;

      /* Рисуем ровно то, что человек видит в круге, только крупнее */
      var cv = document.createElement('canvas');
      cv.width = OUT; cv.height = OUT;
      var g = cv.getContext('2d');
      var k = OUT / BOX;
      g.fillStyle = '#fff';
      g.fillRect(0, 0, OUT, OUT);
      g.drawImage(img, ox * k, oy * k,
        img.naturalWidth * base * zoom * k, img.naturalHeight * base * zoom * k);

      close();
      cv.toBlob(function (blob) {
        if (!blob) return say('Не удалось подготовить снимок', true);
        send(blob);
      }, 'image/jpeg', 0.9);
    });
  }

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
