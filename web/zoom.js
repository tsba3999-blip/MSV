/* © 2026 МСВ. Все права защищены. Подробнее: /legal.html */
/* ============================================================
   Просмотр фотографий

   Любая картинка с атрибутом data-zoom (или внутри .zoomable)
   открывается крупно поверх страницы. Если рядом есть другие
   такие же — их можно листать: крупные стрелки по бокам,
   клавиши ← →, смахивание пальцем. Закрытие — щелчок по
   затемнению, крестик, Esc.

   Откуда берётся список для листания (по порядку):
     1. data-gallery="forma" на общей обёртке — тогда листаются
        ВСЕ фотографии резиденции из photos.js, даже если на
        странице показаны только три (решение заказчика 23.09.2026);
     2. иначе — соседние картинки в ближайшей обёртке.
   ============================================================ */

(function () {
  'use strict';

  var box = null;        // само окно просмотра
  var list = [];         // [{ src, alt }]
  var at = 0;            // какая фотография открыта

  /* ---------- собрать список ---------- */

  function fromGallery(wrap) {
    var id = wrap.getAttribute('data-gallery');
    if (!id || !window.MSV_PHOTOS) return null;
    var all = MSV_PHOTOS.all(id);
    if (!all.length) return null;
    return all.map(function (p) { return { src: p.src, alt: p.alt }; });
  }

  function fromNeighbours(img) {
    var wrap = img.parentNode, imgs = [];
    while (wrap && wrap !== document.body) {
      imgs = Array.prototype.slice.call(wrap.querySelectorAll('img[data-zoom], .zoomable img'));
      if (imgs.length > 1) break;
      wrap = wrap.parentNode;
    }
    if (imgs.length < 2) imgs = [img];
    return imgs.map(function (i) { return { src: i.getAttribute('data-zoom') || i.src, alt: i.alt }; });
  }

  /* Ищем открытую фотографию в списке: адреса могут быть
     относительными и абсолютными, поэтому сравниваем хвост */
  function indexOf(src) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].src === src || src.indexOf(list[i].src) >= 0 || list[i].src.indexOf(src) >= 0) return i;
    }
    return 0;
  }

  /* ---------- окно ---------- */

  var CHEV_L = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  var CHEV_R = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';

  function open(items, start) {
    close();
    list = items; at = start;

    box = document.createElement('div');
    box.className = 'msv-zoom';
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
    box.innerHTML =
      '<button type="button" class="msv-zoom__close" aria-label="Закрыть">&times;</button>' +
      '<button type="button" class="msv-zoom__nav msv-zoom__nav--prev" aria-label="Предыдущее фото">' + CHEV_L + '</button>' +
      '<button type="button" class="msv-zoom__nav msv-zoom__nav--next" aria-label="Следующее фото">' + CHEV_R + '</button>' +
      '<img alt="">' +
      '<span class="msv-zoom__cap"></span>';
    document.body.appendChild(box);

    if (list.length < 2) {
      box.querySelector('.msv-zoom__nav--prev').hidden = true;
      box.querySelector('.msv-zoom__nav--next').hidden = true;
    }
    show(at);

    box.addEventListener('click', function (e) {
      if (e.target.closest('.msv-zoom__close')) return close();
      if (e.target.closest('.msv-zoom__nav--prev')) return step(-1);
      if (e.target.closest('.msv-zoom__nav--next')) return step(1);
      if (e.target === box) close();                 // щелчок по затемнению
    });
    swipe(box);
    box.querySelector('.msv-zoom__close').focus();
  }

  function show(i) {
    at = (i + list.length) % list.length;
    var p = list[at];
    var img = box.querySelector('img');
    img.src = p.src; img.alt = p.alt || '';
    box.querySelector('.msv-zoom__cap').textContent =
      (p.alt || '') + (list.length > 1 ? (p.alt ? ' · ' : '') + (at + 1) + ' из ' + list.length : '');
  }

  function step(d) { if (box && list.length > 1) show(at + d); }

  function close() {
    if (box && box.parentNode) box.parentNode.removeChild(box);
    box = null; list = []; at = 0;
  }

  /* Смахивание пальцем — как в ленте фотографий на странице резиденций */
  function swipe(el) {
    var x0 = null;
    el.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    el.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
    }, { passive: true });
  }

  /* ---------- что открывает просмотр ---------- */

  document.addEventListener('click', function (e) {
    if (document.body.classList.contains('editing')) return;   // в режиме правки не увеличиваем

    // «+17» — открыть галерею с первой из ещё не показанных
    var more = e.target.closest('[data-more]');
    if (more) {
      var mWrap = more.closest('[data-gallery]');
      var mAll = mWrap && fromGallery(mWrap);
      if (mAll) {
        e.preventDefault();
        open(mAll, Math.min(parseInt(more.getAttribute('data-more'), 10) || 0, mAll.length - 1));
        return;
      }
    }

    var img = e.target.closest('img[data-zoom], .zoomable img');
    if (!img || !img.src) return;
    e.preventDefault();

    var wrap = img.closest('[data-gallery]');
    var items = (wrap && fromGallery(wrap)) || fromNeighbours(img);
    list = items;                                    // indexOf смотрит в list
    open(items, indexOf(img.getAttribute('data-zoom') || img.src));
  });

  document.addEventListener('keydown', function (e) {
    if (!box) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'ArrowRight') step(1);
  });

  /* ---------- оформление ---------- */

  var css = document.createElement('style');
  css.textContent =
    'img[data-zoom],.zoomable img{cursor:zoom-in}' +
    '[data-more]{cursor:zoom-in}' +
    '.msv-zoom{position:fixed;inset:0;z-index:10060;display:flex;flex-direction:column;align-items:center;justify-content:center;' +
      'gap:12px;padding:24px;background:rgba(16,22,31,.85);cursor:zoom-out}' +
    '.msv-zoom img{max-width:min(92vw,1100px);max-height:82vh;border-radius:12px;object-fit:contain;cursor:default;background:#F5F1EA}' +
    '.msv-zoom__cap{color:#fff;font:600 15px var(--msv-font,sans-serif);text-align:center}' +
    '.msv-zoom__close{position:absolute;top:16px;right:16px;width:40px;height:40px;font-size:26px;line-height:1;color:#fff;' +
      'background:rgba(255,255,255,.14);border:0;border-radius:50%;cursor:pointer}' +
    '.msv-zoom__close:hover{background:rgba(255,255,255,.26)}' +
    '.msv-zoom__close:focus-visible{outline:2px solid #fff;outline-offset:2px}' +
    /* Стрелки: белый круг и графитовый шеврон — те же, что у кнопки «Вернуться» */
    '.msv-zoom__nav{position:absolute;top:50%;transform:translateY(-50%);width:56px;height:56px;display:flex;' +
      'align-items:center;justify-content:center;padding:0;color:#34495E;background:#fff;border:0;border-radius:50%;' +
      'box-shadow:0 6px 20px rgba(16,22,31,.35);cursor:pointer;transition:transform .16s ease,background .16s ease}' +
    '.msv-zoom__nav svg{width:28px;height:28px}' +
    '.msv-zoom__nav--prev{left:16px}' +
    '.msv-zoom__nav--next{right:16px}' +
    '.msv-zoom__nav:hover{background:#F5F1EA;transform:translateY(-50%) scale(1.06)}' +
    '.msv-zoom__nav:active{transform:translateY(-50%) scale(.96)}' +
    '.msv-zoom__nav:focus-visible{outline:2px solid #fff;outline-offset:3px}' +
    '@media (max-width:640px){.msv-zoom__nav{width:48px;height:48px}.msv-zoom__nav svg{width:24px;height:24px}' +
      '.msv-zoom__nav--prev{left:8px}.msv-zoom__nav--next{right:8px}}';
  document.head.appendChild(css);
})();
