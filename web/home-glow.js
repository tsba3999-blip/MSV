/* Живой градиент: у каждого пятна своя «цель» — точка, куда оно стремится.
   Без курсора цель медленно кружит по экрану; с курсором — курсор со сдвигом.
   Пятно идёт к цели как груз на пружине (ускорение + трение), поэтому после
   остановки курсора ещё пару-тройку секунд покачивается и затихает. */
(function () {
  'use strict';
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var box = document.getElementById('glow'); if (!box) return;
  var dots = Array.prototype.slice.call(box.children);
  var W = innerWidth, H = innerHeight;
  addEventListener('resize', function () { W = innerWidth; H = innerHeight; });
  var mouse = null, lastMove = 0;
  function onMove(x, y) { mouse = [x, y]; lastMove = performance.now(); }
  addEventListener('pointermove', function (e) { onMove(e.clientX, e.clientY); }, { passive: true });
  addEventListener('touchmove', function (e) { var t = e.touches[0]; if (t) onMove(t.clientX, t.clientY); }, { passive: true });

  var B = dots.map(function (el, i) {
    return { el: el, x: W * (0.25 + 0.25 * i), y: H * (0.3 + 0.2 * i), vx: 0, vy: 0,
             k: 0.012 + 0.004 * i, damp: 0.955 - 0.01 * i,          // жёсткость пружины и трение: разные — пятна не сливаются
             ox: (i - 1) * 0.18, oy: (i - 1) * 0.12, ph: i * 2.1, sp: 0.00016 + 0.00005 * i };
  });
  function frame(now) {
    var idle = !mouse || now - lastMove > 6000;   // через 6 с без курсора — снова свободное плавание
    B.forEach(function (b) {
      var tx, ty;
      if (idle) { tx = W * (0.5 + 0.32 * Math.sin(now * b.sp + b.ph)); ty = H * (0.5 + 0.28 * Math.cos(now * b.sp * 1.3 + b.ph)); }
      else { tx = mouse[0] + W * b.ox; ty = mouse[1] + H * b.oy; }
      b.vx += (tx - b.x) * b.k; b.vy += (ty - b.y) * b.k;
      b.vx *= b.damp; b.vy *= b.damp;
      b.x += b.vx; b.y += b.vy;
      b.el.style.transform = 'translate3d(' + b.x.toFixed(1) + 'px,' + b.y.toFixed(1) + 'px,0)';
    });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
