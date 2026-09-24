/* © 2026 МСВ. Все права защищены. Программа для ЭВМ охраняется ст. 1259, 1261 ГК РФ. Подробнее: /legal.html */
/* ============================================================
   Резиденты: общий сценарий для кабинета администратора и кабинета
   модератора. Страницы отличаются только боковым меню.
   ============================================================ */
MSV.ready(function (ctx) {
  'use strict';

  /* Страница общая для двух кабинетов — ссылку на шахматку берём по своей
     же странице, чтобы модератор не уходил в кабинет администратора. */
  var SHAHMATKA = /^staff-/.test(location.pathname.split('/').pop() || '')
    ? 'staff-shahmatka.html' : 'admin-shahmatka.html';

  var RES = ctx.residences;
  var DAY = 86400000;
  var now = new Date();
  var today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());

  function day(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
    return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null;
  }

  /* Число без «руб.»: в подстрочнике единица уже названа в сумме над ним */
  function num(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u2009');
  }

  function money(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u2009') + '\u2009руб.';
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function fmt(ts) {
    if (ts === null) return '—';
    var d = new Date(ts);
    return String(d.getUTCDate()).padStart(2, '0') + '.' +
           String(d.getUTCMonth() + 1).padStart(2, '0') + '.' + d.getUTCFullYear();
  }

  /* Полных лет по календарю: делением на 365 возраст в день рождения
     сдвигается на сутки. */
  function years(iso) {
    var bd = day(iso);
    if (bd === null) return null;
    var t = new Date(today), x = new Date(bd);
    var age = t.getUTCFullYear() - x.getUTCFullYear();
    if (t.getUTCMonth() < x.getUTCMonth() ||
        (t.getUTCMonth() === x.getUTCMonth() && t.getUTCDate() < x.getUTCDate())) age--;
    return age;
  }

  /* ---------- Собираем всех резидентов сети ---------- */

  var ALL = [];

  RES.forEach(function (res) {
    var d = ctx.bookings(res);
    var byId = {};
    d.residents.forEach(function (r) { byId[r.id] = r; });
    var bedById = {}; res.beds.forEach(function (b) { bedById[b.id] = b; });
    var roomById = {}; res.rooms.forEach(function (r) { roomById[r.id] = r; });

    d.bookings.forEach(function (b) {
      var person = byId[b.residentId];
      if (!person) return;
      var bed = bedById[b.bedId];
      var room = bed ? roomById[bed.roomId] : null;
      var owed = (b.accrued || 0) - (b.paid || 0);

      var regs = (person.registrations || []).slice().sort(function (x, y) {
        return (day(y.until) || 0) - (day(x.until) || 0);
      });
      var lastReg = regs[0] || null;
      var until = lastReg ? day(lastReg.until) : null;

      ALL.push({
        res: res, userId: person.id, bookingId: b.id,
        name: person.name,
        university: person.university || '',
        phone: person.phone || '', messengers: person.messengers || [],
        bed: bed ? bed.label : '',
        room: room ? (room.name || ('к. ' + room.number)) : '',
        owed: owed,
        accrued: b.accrued || 0, paid: b.paid || 0,
        penalty: Number(b.penalty) || 0, deposit: !!b.depositCharged,
        age: years(person.birthday),
        regUntil: until,
        from: day(b.from), to: day(b.to)
      });
    });
  });

  ALL.sort(function (a, b) { return a.name.localeCompare(b.name, 'ru'); });

  /* ---------- Фильтры ---------- */

  var state = { q: '', res: '', only: {} };

  /* Если пришли из шахматки конкретной резиденции — показываем её.
     «Все» доступно рядом одним нажатием. */
  try {
    var last = sessionStorage.getItem('msv.lastResidence');
    if (last && RES.some(function (r) { return r.id === last; })) {
      state.res = last;
      document.querySelectorAll('[data-res]').forEach(function (c) {
        c.setAttribute('aria-pressed', c.getAttribute('data-res') === last ? 'true' : 'false');
      });
    }
  } catch (e) { /* хранилище недоступно */ }
  var rowsBox = document.getElementById('rows');
  var countBox = document.getElementById('count');

  function matches(x) {
    if (state.res && x.res.id !== state.res) return false;
    if (state.only.debt && !(x.owed > 0.5)) return false;
    if (state.only.penalty && !(x.penalty > 0.5)) return false;
    if (state.only.minor && !(x.age !== null && x.age < 18)) return false;
    if (state.only.reg && !(x.regUntil !== null && x.regUntil < today)) return false;
    if (state.q) {
      var hay = (x.name + ' ' + x.bed + ' ' + x.room + ' ' + x.university + ' ' + x.phone).toLowerCase();
      if (hay.replace(/ё/g, 'е').indexOf(state.q) === -1) return false;
    }
    return true;
  }

  /* Телефон в цифрах, с восьмёрки — на семёрку: ссылки мессенджеров ждут
     международный вид. */
  function digits(phone) {
    var d = String(phone || '').replace(/\D/g, '');
    if (d.length === 11 && d.charAt(0) === '8') d = '7' + d.slice(1);
    return d;
  }

  /* Мессенджеры кружками после телефона: «Т» — Telegram, «М» — Max.
     Указан в анкете — кружок графитовый и открывает чат; не указан —
     бледный, без ссылки (решение заказчика 24.09.2026). */
  function mess(x) {
    var d = digits(x.phone);
    var have = {};
    (x.messengers || []).forEach(function (k) { have[String(k).toLowerCase()] = true; });
    var out = ['tg', 'max'].map(function (k) {
      var letter = k === 'tg' ? 'Т' : 'М';
      var name = k === 'tg' ? 'Telegram' : 'Max';
      if (have[k] && d) {
        var url = k === 'tg' ? 'https://t.me/+' + d : 'https://max.ru/+' + d;
        return '<a class="mess-dot mess-dot--on" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer" ' +
               'title="Написать в ' + name + '">' + letter + '</a>';
      }
      return '<span class="mess-dot mess-dot--off" title="' + name + ' не указан в анкете">' + letter + '</span>';
    }).join('');
    return '<span class="mess-dots">' + out + '</span>';
  }

  function initials(name) {
    var p = String(name).trim().split(/\s+/);
    return p.length > 1 ? (p[0][0] + p[1][0]).toUpperCase() : p[0][0].toUpperCase();
  }

  /* Порядок строк. Заголовки таблицы — переключатели: первое нажатие
     выстраивает от А до Я, повторное переворачивает (решение заказчика
     24.09.2026). Места сравниваем «по-человечески»: 2 раньше 13. */
  var sort = { by: 'name', dir: 1 };

  function chunks(s) {
    return String(s || '').split(/(\d+)/).filter(Boolean)
      .map(function (p) { return /^\d+$/.test(p) ? Number(p) : p; });
  }
  function cmpPlace(a, b) {
    var x = chunks(a), y = chunks(b);
    for (var i = 0; i < Math.max(x.length, y.length); i++) {
      if (x[i] === undefined) return -1;
      if (y[i] === undefined) return 1;
      if (typeof x[i] === 'number' && typeof y[i] === 'number') { if (x[i] !== y[i]) return x[i] - y[i]; }
      else { var c = String(x[i]).localeCompare(String(y[i]), 'ru'); if (c) return c; }
    }
    return 0;
  }
  function ordered(list) {
    return list.slice().sort(function (a, b) {
      var c;
      if (sort.by === 'uni') {
        var au = a.university || '', bu = b.university || '';
        if (!au !== !bu) return au ? -1 : 1;          // без вуза — всегда в конец
        c = au.localeCompare(bu, 'ru') || a.name.localeCompare(b.name, 'ru');
      } else if (sort.by === 'place') {
        c = String(a.res.name).localeCompare(String(b.res.name), 'ru') || cmpPlace(a.bed, b.bed);
      } else {
        c = a.name.localeCompare(b.name, 'ru');
      }
      return c * sort.dir;
    });
  }

  function markSort() {
    document.querySelectorAll('.sort').forEach(function (b) {
      var on = b.getAttribute('data-sort') === sort.by;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.setAttribute('data-dir', on ? (sort.dir > 0 ? 'up' : 'down') : '');
    });
  }

  document.querySelector('.grid thead').addEventListener('click', function (e) {
    var b = e.target.closest('.sort'); if (!b) return;
    var by = b.getAttribute('data-sort');
    if (sort.by === by) sort.dir = -sort.dir; else { sort.by = by; sort.dir = 1; }
    render();
  });

  /* Итоги по сети — то, что раньше стояло на «Начислениях» */
  function stats() {
    var box = document.getElementById('stats');
    if (!box) return;
    var acc = 0, paid = 0, owed = 0, pen = 0, debtors = 0;
    ALL.forEach(function (x) {
      acc += x.accrued; paid += x.paid; pen += x.penalty;
      if (x.owed > 0.5) { owed += x.owed; debtors++; }
    });
    box.innerHTML = [
      ['Начислено', money(acc), ALL.length + ' проживающих', ''],
      ['Получено', money(paid), Math.round(100 * paid / (acc || 1)) + '% от начисленного', ''],
      ['Остаток к получению', money(owed), debtors + ' чел. не закрыли месяц', owed > 0 ? ' stat--debt' : ''],
      ['Пени', money(pen), pen ? 'за просрочку' : 'просрочек нет', '']
    ].map(function (s) {
      return '<div class="stat' + s[3] + '"><span class="stat__label">' + esc(s[0]) + '</span>' +
        '<span class="stat__value">' + esc(s[1]) + '</span>' +
        '<span class="msv-note stat__note">' + esc(s[2]) + '</span></div>';
    }).join('');
  }

  function render() {
    markSort();
    stats();
    var list = ordered(ALL.filter(matches));
    countBox.textContent = list.length + ' из ' + ALL.length;

    if (!list.length) {
      rowsBox.innerHTML = '<tr><td colspan="6" class="grid__empty">Никого не нашлось. Снимите фильтр или измените запрос.</td></tr>';
      return;
    }

    rowsBox.innerHTML = list.map(function (x) {
      /* Долг одной колонкой: крупно — сколько ещё должен, мелко — сколько
         из скольки уже оплачено. Отдельный столбец «остаток» не нужен: его
         пришлось бы считать глазами (решение заказчика 24.09.2026). */
      var pay = x.owed > 0.5
        ? '<b class="owe">' + esc(money(x.owed)) + '</b>' +
          (x.paid > 0.5 ? '<span class="msv-note sub">оплачено ' + esc(num(x.paid)) + ' из ' + esc(num(x.accrued)) + '</span>' : '') +
          (x.penalty > 0.5 ? '<span class="msv-note sub">пени ' + esc(num(x.penalty)) + '</span>' : '')
        : '<span class="tag tag--ok">без долга</span>';

      /* Кнопки на время переноса данных: оплату и депозит за тех, кто
         заселился до появления системы, заносит модератор. */
      var payBtn = x.owed > 0.5
        ? '<button class="msv-btn msv-btn--s msv-btn--tertiary" type="button" data-act="paid" title="Отметить оплату за месяц">Внести</button>'
        : '<span class="tag tag--ok">оплачено</span>';
      var depBtn = x.deposit
        ? '<span class="tag tag--ok">внесён</span>'
        : '<button class="msv-btn msv-btn--s msv-btn--tertiary" type="button" data-act="dep" title="Депозит равен месячной плате и засчитывается оплатой августа">Внести</button>';

      /* Нет регистрации — кнопка «Загрузить», есть — метка со сроком. Метка
         тоже нажимается: так заменяют просроченную (24.09.2026) */
      var reg;
      if (x.regUntil === null) {
        reg = '<button class="msv-btn msv-btn--s msv-btn--tertiary" type="button" data-reg title="Загрузить регистрацию">Загрузить</button>';
      } else {
        var rc = x.regUntil < today ? 'tag--bad'
               : (x.regUntil - today <= 30 * DAY ? 'tag--warn' : 'tag--ok');
        var rt = x.regUntil < today ? 'истекла ' : 'до ';
        reg = '<button class="tag ' + rc + ' tag-btn" type="button" data-reg title="Заменить регистрацию">' +
              rt + esc(fmt(x.regUntil)) + '</button>';
      }

      var minor = (x.age !== null && x.age < 18)
        ? ' <span class="tag tag--bad">до 18</span>' : '';

      return '<tr data-name="' + esc(x.name) + '" data-user="' + esc(x.userId) + '" data-booking="' + esc(x.bookingId) + '">' +
        /* Щелчок по имени открывает карточку резидента — так же, как в
           шахматке (решение заказчика 24.09.2026) */
        '<td><a class="who-cell who-cell--link" href="resident-card.html?id=' + esc(x.userId) + '" title="Открыть карточку резидента">' +
          '<span class="who-cell__face">' + esc(initials(x.name)) + '</span>' +
          '<span><span class="who-cell__name">' + esc(x.name) + minor + '</span>' +
          '<span class="msv-note sub">' + esc(x.university) + '</span></span>' +
        '</a></td>' +
        '<td><a href="' + SHAHMATKA + '?res=' + encodeURIComponent(x.res.id) + '">' +
          esc(x.bed) + '</a><span class="msv-note sub">' + esc(x.room) + ' · ' + esc(x.res.name) + '</span></td>' +
        '<td>' + (x.phone ? '<a href="tel:+' + esc(digits(x.phone)) + '">' + esc(x.phone) + '</a>' : '—') + mess(x) + '</td>' +
        '<td>' + pay + '</td><td>' + payBtn + '</td><td>' + depBtn + '</td>' +
        '<td>' + reg + '</td>' +
        '<td class="num"><button class="msv-btn msv-btn--s msv-btn--tertiary del" type="button" data-del title="Удалить резидента из базы">Удалить</button></td>' +
      '</tr>';
    }).join('');
  }

  /* ---------- Управление ---------- */

  var timer = null;
  // ?q=Фамилия — из шахматки («Профиль»): сразу показать нужного резидента
  var preQ = new URLSearchParams(location.search).get('q');
  if (preQ) { var qEl = document.getElementById('q'); qEl.value = preQ; setTimeout(function () { qEl.dispatchEvent(new Event('input', { bubbles: true })); }, 0); }
  document.getElementById('q').addEventListener('input', function (e) {
    clearTimeout(timer);
    var v = e.target.value;
    timer = setTimeout(function () {
      state.q = v.trim().toLowerCase().replace(/ё/g, 'е');
      render();
    }, 150);
  });

  document.querySelector('.bar').addEventListener('click', function (e) {
    var chip = e.target.closest('.bar__chip');
    if (!chip) return;

    if (chip.hasAttribute('data-res')) {
      document.querySelectorAll('[data-res]').forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
      chip.setAttribute('aria-pressed', 'true');
      state.res = chip.getAttribute('data-res');
    } else if (chip.hasAttribute('data-only')) {
      var key = chip.getAttribute('data-only');
      var on = chip.getAttribute('aria-pressed') === 'true';
      chip.setAttribute('aria-pressed', on ? 'false' : 'true');
      state.only[key] = !on;
    }
    render();
  });

  render();

  /* ---------- Регистрация: модератор загружает скан и срок ---------- */

  var regPicker = document.createElement('input');
  regPicker.type = 'file'; regPicker.accept = 'image/*,application/pdf'; regPicker.style.display = 'none';
  document.body.appendChild(regPicker);
  var regFor = null;

  /* Удаление резидента: двойное согласие. Сперва человек соглашается с тем,
     что именно исчезнет, потом набирает имя руками. Одного промаха по кнопке
     мало (решение заказчика 24.09.2026). */
  rowsBox.addEventListener('click', function (e) {
    var d = e.target.closest('[data-del]'); if (!d) return;
    var tr = d.closest('tr');
    var name = tr.dataset.name;
    var id = tr.dataset.user;

    var rows = ALL.filter(function (x) { return String(x.userId) === String(id); }).length;
    var first = 'Удалить резидента ' + name + ' из базы?\n\n' +
      'Исчезнут: ' + rows + ' ' + (rows === 1 ? 'бронь' : (rows < 5 ? 'брони' : 'броней')) +
      ', все начисления и платежи, заявки, документы и анкета.\n' +
      'Вернуть удалённое будет нельзя.';
    if (!confirm(first)) return;

    var typed = prompt('Второе подтверждение.\nНабери имя резидента точно так, как оно записано:\n\n' + name);
    if (typed === null) return;
    if (typed.trim().replace(/\s+/g, ' ').toLowerCase() !== name.trim().replace(/\s+/g, ' ').toLowerCase()) {
      alert('Имя набрано иначе. Ничего не удалено.');
      return;
    }

    if (!ctx.live) { alert('Без сервера: ' + name + ' был бы удалён из базы.'); return; }
    d.disabled = true;
    ctx.api('POST', '/api/residents/' + encodeURIComponent(id) + '/delete', { confirm: true, name: typed })
      .then(function (r) {
        if (r.status === 200) { alert('Резидент ' + name + ' удалён.'); location.reload(); return; }
        d.disabled = false;
        alert(r.body && r.body.error || 'Не удалось удалить');
      })
      .catch(function () { d.disabled = false; alert('Сервер не отвечает.'); });
  });

  /* Оплата и депозит — те же действия, что были на «Начислениях».
     Обе кнопки спрашивают подтверждение: отменить запись нечем. */
  rowsBox.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-act="paid"]'); if (!btn) return;
    var tr = btn.closest('tr');
    var x = ALL.filter(function (y) { return String(y.bookingId) === String(tr.dataset.booking); })[0];
    if (!x) return;
    var sum = Math.max(0, x.owed);
    if (!confirm('Отметить оплату за ' + x.name + '?\nСумма: ' + money(sum) + '.')) return;
    function apply() { x.paid = x.accrued; x.owed = 0; render(); }
    if (!ctx.live) { apply(); return; }
    btn.disabled = true;
    ctx.api('POST', '/api/payments', { bookingId: x.bookingId, amount: sum, method: 'cash' })
      .then(function (res) {
        if (res.status === 201) { apply(); return; }
        btn.disabled = false; alert(res.body && res.body.error || 'Не удалось');
      })
      .catch(function () { btn.disabled = false; alert('Сервер не отвечает'); });
  });

  rowsBox.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-act="dep"]'); if (!btn) return;
    var tr = btn.closest('tr');
    var x = ALL.filter(function (y) { return String(y.bookingId) === String(tr.dataset.booking); })[0];
    if (!x) return;
    if (!confirm('Внести депозит за ' + x.name + '?\nДепозит равен месячной плате и засчитывается оплатой августа.')) return;
    function apply(sum) { x.deposit = true; x.accrued += sum; x.paid += sum; render(); }
    if (!ctx.live) { apply(0); return; }
    btn.disabled = true;
    ctx.api('POST', '/api/bookings/' + encodeURIComponent(x.bookingId) + '/deposit', {})
      .then(function (res) {
        if (res.status === 201) { apply(Number(res.body && res.body.amount) || 0); return; }
        btn.disabled = false; alert(res.body && res.body.error || 'Не удалось');
      })
      .catch(function () { btn.disabled = false; alert('Сервер не отвечает'); });
  });

  rowsBox.addEventListener('click', function (e) {
    var b = e.target.closest('[data-reg]'); if (!b) return;
    regFor = b.closest('tr').dataset.name;
    var until = prompt('Регистрация для ' + regFor + '.\nДействует до (ДД.ММ.ГГГГ):');
    if (!until || !/^\d{2}\.\d{2}\.\d{4}$/.test(until)) { if (until !== null) alert('Дата в виде ДД.ММ.ГГГГ'); return; }
    var number = prompt('Номер документа (можно пропустить):') || '';
    regPicker.dataset.until = until; regPicker.dataset.number = number;
    regPicker.click();
  });

  regPicker.addEventListener('change', function () {
    var file = regPicker.files && regPicker.files[0]; if (!file) return;
    var until = regPicker.dataset.until.split('.').reverse().join('-');
    var number = regPicker.dataset.number;
    // ЗДЕСЬ: POST /api/upload → url, затем POST /api/users/:id/registration { number, until, fileUrl }
    if (!ctx.live) { alert('Без сервера: регистрация для ' + regFor + ' до ' + regPicker.dataset.until + ' (' + file.name + ') сохранилась бы в базу.'); regPicker.value = ''; return; }
    var row = ALL.filter(function (x) { return x.name === regFor; })[0];
    fetch('/api/upload', { method: 'POST', credentials: 'same-origin', headers: { 'X-File-Name': encodeURIComponent(file.name) }, body: file })
      .then(function (r) { return r.json().then(function (j) { return { s: r.status, j: j }; }); })
      .then(function (r) {
        if (r.s !== 201) throw new Error(r.j.error || 'не загрузилось');
        return ctx.api('POST', '/api/users/' + encodeURIComponent(row && row.userId || '') + '/registration', { number: number, until: until, fileUrl: r.j.url });
      })
      .then(function (r) { if (r.status === 201) { alert('Регистрация сохранена. Резидент увидит её в «Мои документы».'); location.reload(); } else alert(r.body && r.body.error || 'Не удалось'); })
      .catch(function (e) { alert('Ошибка: ' + e.message); });
    regPicker.value = '';
  });

  /* ---------- Очередь на места ---------- */
  document.getElementById('wlCheck').addEventListener('click', function () {
    if (!ctx.live) { alert('Без сервера: сервер найдёт свободные на сегодня места и разошлёт всем подходящим заявкам из очереди — одним сообщением каждому.'); return; }
    ctx.api('POST', '/api/waitlist/check').then(function (r) {
      alert(r.status === 200 ? 'Свободных мест: ' + r.body.free + '. Уведомлено: ' + r.body.notified + ' чел.' : (r.body && r.body.error || 'Не удалось'));
    }).catch(function () { alert('Сервер не отвечает'); });
  });

  /* ---------- Приглашение ---------- */

  var inv = document.getElementById('invite');
  document.getElementById('inviteBtn').addEventListener('click', function () { inv.hidden = !inv.hidden; if (!inv.hidden) document.getElementById('invName').focus(); });
  document.getElementById('invCancel').addEventListener('click', function () { inv.hidden = true; });
  document.getElementById('invRand').addEventListener('click', function () {
    var p;
    do { p = String(Math.floor(Math.random() * 10000)).padStart(4, '0'); }
    while (/^(\d)\1{3}$/.test(p) || p === '1234' || p === '4321');
    document.getElementById('invPin').value = p;
  });

  document.getElementById('invSend').addEventListener('click', function () {
    var body = {
      name: document.getElementById('invName').value.trim(),
      contact: document.getElementById('invContact').value.trim(),
      pin: document.getElementById('invPin').value.trim()
    };
    var errBox = document.getElementById('invErr'), errText = document.getElementById('invErrText');
    errBox.hidden = true;
    if (!body.name || !body.contact || !/^\d{4}$/.test(body.pin)) {
      errText.textContent = 'Заполни имя, контакт и четырёхзначный код.'; errBox.hidden = false; return;
    }
    fetch('/api/auth/invite', { method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { return { s: r.status, j: j }; }); })
      .then(function (r) {
        if (r.s !== 201) { errText.textContent = r.j.error || 'Не удалось'; errBox.hidden = false; return; }
        alert('Резидент ' + body.name + ' приглашён. Код входа: ' + body.pin + '. Сообщи его лично.');
        inv.hidden = true;
      })
      .catch(function () {
        alert('Без сервера приглашение не сохранить. Так это будет работать: ' + body.name + ', код ' + body.pin);
        inv.hidden = true;
      });
  });
});
