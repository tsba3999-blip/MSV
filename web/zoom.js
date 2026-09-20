/* © 2026 МСВ. Все права защищены. Подробнее: /legal.html */
/* ============================================================
   Увеличение фотографий по щелчку

   Любая картинка с атрибутом data-zoom (или внутри .zoomable)
   открывается крупно поверх страницы. Закрытие — щелчок по
   затемнению, крестик, Esc.
   ============================================================ */

(function () {
  'use strict';

  var box = null;

  function open(src, alt) {
    close();
    box = document.createElement('div');
    box.className = 'msv-zoom';
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
    box.innerHTML =
      '<button type="button" class="msv-zoom__close" aria-label="Закрыть">&times;</button>' +
      '<img src="' + src.replace(/"/g, '&quot;') + '" alt="' + String(alt || '').replace(/"/g, '&quot;') + '">' +
      (alt ? '<span class="msv-zoom__cap">' + String(alt).replace(/</g, '&lt;') + '</span>' : '');
    document.body.appendChild(box);
    box.addEventListener('click', function (e) {
      if (e.target === box || e.target.closest('.msv-zoom__close')) close();
    });
    box.querySelector('.msv-zoom__close').focus();
  }

  function close() {
    if (box && box.parentNode) box.parentNode.removeChild(box);
    box = null;
  }

  document.addEventListener('click', function (e) {
    var img = e.target.closest('img[data-zoom], .zoomable img');
    if (!img || !img.src) return;
    if (document.body.classList.contains('editing')) return;   // в режиме правки не увеличиваем
    e.preventDefault();
    open(img.dataset.zoom || img.src, img.alt);
  });

  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && box) close(); });

  var css = document.createElement('style');
  css.textContent =
    'img[data-zoom],.zoomable img{cursor:zoom-in}' +
    '.msv-zoom{position:fixed;inset:0;z-index:10060;display:flex;flex-direction:column;align-items:center;justify-content:center;' +
      'gap:12px;padding:24px;background:rgba(16,22,31,.85);cursor:zoom-out}' +
    '.msv-zoom img{max-width:min(92vw,1100px);max-height:82vh;border-radius:12px;object-fit:contain;cursor:default;background:#F5F1EA}' +
    '.msv-zoom__cap{color:#fff;font:600 15px var(--msv-font,sans-serif);text-align:center}' +
    '.msv-zoom__close{position:absolute;top:16px;right:16px;width:40px;height:40px;font-size:26px;line-height:1;color:#fff;' +
      'background:rgba(255,255,255,.14);border:0;border-radius:50%;cursor:pointer}' +
    '.msv-zoom__close:hover{background:rgba(255,255,255,.26)}' +
    '.msv-zoom__close:focus-visible{outline:2px solid #fff;outline-offset:2px}';
  document.head.appendChild(css);
})();
