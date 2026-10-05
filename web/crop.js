(function(){'use strict';var BOX=260,OUT=512;
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
    '.crop__img{max-width:none;position:absolute;left:0;top:0;transform-origin:0 0;pointer-events:none;-webkit-user-drag:none}' +
    '.crop__zoom{display:flex;align-items:center;gap:10px;margin:14px 0 16px}' +
    '.crop__zoom input{flex:1 1 auto;accent-color:var(--msv-red,#FB344A)}' +
    '.crop__zoom span{font-size:12px;color:var(--msv-n500,#6B665E)}' +
    '.crop__act{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}';
  document.head.appendChild(css);


  function openCrop(img,resolve,reject) {
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
          '<input type="range" min="50" max="400" value="100" aria-label="Приблизить">' +
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
      ox = Math.min(BOX-20, Math.max(20-w, ox));
      oy = Math.min(BOX-20, Math.max(20-h, oy));
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
      var next = Math.min(4, Math.max(.5, zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
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

    function close(accepted) { document.removeEventListener('keydown',esc); if (wrap.parentNode) wrap.parentNode.removeChild(wrap); if(!accepted)resolve(null); }
    function esc(e) { if(e.key==='Escape')close(); }
    document.addEventListener('keydown',esc);

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

      close(true);
      cv.toBlob(function (blob) {
        if (!blob) return reject(Error('Не удалось подготовить снимок'));
        resolve(blob);
      }, 'image/jpeg', 0.9);
    });
  }


window.MSVCrop=function(file){return new Promise(function(resolve,reject){if(file.size>20*1024*1024)return reject(Error('Снимок больше 20 МБ'));var url=URL.createObjectURL(file),img=new Image();img.onload=function(){openCrop(img,function(blob){URL.revokeObjectURL(url);resolve(blob);},reject);};img.onerror=function(){URL.revokeObjectURL(url);reject(Error('Не удалось открыть изображение'));};img.src=url;});};})();
