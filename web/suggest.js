/* © 2026 МСВ. Все права защищены. Программа для ЭВМ охраняется ст. 1259, 1261 ГК РФ. Использование без разрешения правообладателя запрещено. Подробнее: /legal.html */
/* ============================================================
   МСВ — поле с подсказками (вуз или колледж)

   Подключение:
     <script src="universities.js"></script>
     <script src="suggest.js"></script>
     <script>MSVSuggest.attach('#school', window.MSV_UNIVERSITIES);</script>

   Поведение:
   · подсказки появляются с первой введённой буквы;
   · находит и по аббревиатуре, и по словам полного названия;
   · «ё» и «е» считаются одной буквой, регистр не важен;
   · стрелки вверх-вниз, Enter выбирает, Esc закрывает;
   · своё название ввести можно — список ничего не навязывает.
   ============================================================ */

(function (global) {
  'use strict';

  var MAX = 8;

  /* ---------- Нормализация ---------- */

  function norm(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[«»"'()]/g, ' ')
      .replace(/[—–-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ---------- Разбор записи на части ---------- */

  function prepare(list) {
    return list.map(function (full) {
      var dash = full.indexOf('—');
      var abbr = dash > 0 ? full.slice(0, dash) : '';
      var rest = dash > 0 ? full.slice(dash + 1) : full;
      var haystack = norm(full);
      return {
        full: full,
        abbr: norm(abbr),
        name: norm(rest),
        hay: haystack,
        words: haystack.split(' ')
      };
    });
  }

  /* ---------- Оценка совпадения ----------
     Чем меньше число, тем выше запись в списке.
     0 — аббревиатура начинается с запроса («вшэ» → ВШЭ)
     1 — название начинается с запроса
     2 — с запроса начинается любое слово («высшая» → Высшая школа)
     3 — запрос встречается где-то внутри
     null — не подходит                                        */

  function score(item, q) {
    if (item.abbr && item.abbr.indexOf(q) === 0) return 0;
    if (item.name.indexOf(q) === 0) return 1;
    for (var i = 0; i < item.words.length; i++) {
      if (item.words[i].indexOf(q) === 0) return 2;
    }
    if (item.hay.indexOf(q) !== -1) return 3;
    return null;
  }

  function search(items, query) {
    var q = norm(query);
    if (!q) return [];
    var out = [];
    for (var i = 0; i < items.length; i++) {
      var s = score(items[i], q);
      if (s !== null) out.push({ item: items[i], s: s, i: i });
    }
    out.sort(function (a, b) {
      if (a.s !== b.s) return a.s - b.s;
      if (a.item.full.length !== b.item.full.length) return a.item.full.length - b.item.full.length;
      return a.i - b.i;
    });
    return out.slice(0, MAX).map(function (x) { return x.item; });
  }

  /* ---------- Подсветка совпавшего куска ----------
     Ищем по нормализованному тексту, а показываем исходный,
     поэтому позицию переносим посимвольно. */

  function highlight(full, query) {
    var q = norm(query);
    if (!q) return esc(full);

    var map = [];          // индекс в нормализованной строке -> индекс в исходной
    var buf = '';
    for (var i = 0; i < full.length; i++) {
      var piece = norm(full[i]);
      if (piece === '') {                       // символ схлопнулся в пробел
        if (buf.length && buf[buf.length - 1] !== ' ') { buf += ' '; map.push(i); }
        continue;
      }
      buf += piece; map.push(i);
    }

    var at = buf.indexOf(q);
    if (at === -1) return esc(full);

    var from = map[at];
    var to = at + q.length < map.length ? map[at + q.length] : full.length;
    return esc(full.slice(0, from)) + '<b>' + esc(full.slice(from, to)) + '</b>' + esc(full.slice(to));
  }

  /* ---------- Подключение к полю ---------- */

  function attach(target, list) {
    var input = typeof target === 'string' ? document.querySelector(target) : target;
    if (!input) return null;

    var items = prepare(list || []);
    var open = false;
    var active = -1;
    var shown = [];

    var box = document.createElement('div');
    box.className = 'sug';
    box.setAttribute('role', 'listbox');
    box.id = (input.id || 'sug') + '-list';
    input.parentNode.appendChild(box);

    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-controls', box.id);
    input.setAttribute('autocomplete', 'off');

    var live = document.createElement('span');
    live.className = 'sug__live';
    live.setAttribute('aria-live', 'polite');
    input.parentNode.appendChild(live);

    function render() {
      shown = search(items, input.value);
      active = -1;

      if (!shown.length) { close(); return; }

      box.innerHTML = shown.map(function (it, i) {
        return '<div class="sug__item" role="option" id="' + box.id + '-' + i +
               '" aria-selected="false" data-i="' + i + '">' +
               highlight(it.full, input.value) + '</div>';
      }).join('');

      box.classList.add('sug--on');
      input.setAttribute('aria-expanded', 'true');
      open = true;
      live.textContent = shown.length + ' ' +
        (shown.length === 1 ? 'подсказка' : (shown.length < 5 ? 'подсказки' : 'подсказок'));
    }

    function close() {
      box.classList.remove('sug--on');
      box.innerHTML = '';
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      open = false;
      active = -1;
      live.textContent = '';
    }

    function move(step) {
      if (!open || !shown.length) return;
      active += step;
      if (active < 0) active = shown.length - 1;
      if (active >= shown.length) active = 0;

      Array.prototype.forEach.call(box.children, function (el, i) {
        var on = i === active;
        el.classList.toggle('sug__item--on', on);
        el.setAttribute('aria-selected', on ? 'true' : 'false');
      });

      input.setAttribute('aria-activedescendant', box.id + '-' + active);
      var el = box.children[active];
      if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
    }

    function choose(i) {
      if (i < 0 || i >= shown.length) return;
      input.value = shown[i].full;
      close();
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    input.addEventListener('input', render);
    input.addEventListener('focus', function () { if (input.value) render(); });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); if (!open) render(); else move(1); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); move(-1); return; }
      if (e.key === 'Escape')    { close(); return; }
      if (e.key === 'Enter' && open && active >= 0) { e.preventDefault(); choose(active); }
    });

    // mousedown, а не click: click приходит после blur, и список успевает закрыться
    box.addEventListener('mousedown', function (e) {
      var el = e.target.closest('.sug__item');
      if (!el) return;
      e.preventDefault();
      choose(Number(el.dataset.i));
    });

    document.addEventListener('click', function (e) {
      if (!input.parentNode.contains(e.target)) close();
    });

    input.addEventListener('blur', function () {
      setTimeout(close, 120);   // даём успеть нажатию по подсказке
    });

    return { close: close, refresh: render };
  }

  /* prepare и highlight вынесены наружу, чтобы поиск можно было
     проверить отдельно от страницы. */
  global.MSVSuggest = {
    attach: attach,
    prepare: prepare,
    search: search,
    norm: norm,
    highlight: highlight
  };

})(window);
