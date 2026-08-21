/* ============================================================
   МСВ — Шахматка заселения
   Самостоятельный модуль. Никаких внешних библиотек не нужно.

   Подключение:
     <link rel="stylesheet" href="/shahmatka/shahmatka.css">
     <script src="/shahmatka/shahmatka.js"></script>
     <script>
       var sh = MSVShahmatka.mount('#shahmatka', data);
     </script>

   Публичное API экземпляра:
     sh.setData(data)        — заменить данные и перерисовать
     sh.setStart('2026-09-01') — перейти к дате
     sh.openBooking(id)      — открыть карточку брони
     sh.closePanel()         — закрыть карточку
     sh.refresh()            — перерисовать
     sh.destroy()            — снять обработчики и очистить контейнер
   ============================================================ */

(function (global) {
  'use strict';

  var DAY_MS = 86400000;

  var MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
                'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  var MONTHS_NOM = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  var MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн',
                      'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  var WEEKDAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

  var STATUS_LABEL = {
    booked:  'Забронировано',
    active:  'Проживает',
    leaving: 'Скоро выезд',
    debt:    'Есть долг',
    done:    'Выехал'
  };

  var ZOOM = { s: 26, m: 40, l: 60 };

  /* ---------- Утилиты ---------- */

  function esc(v) {
    if (v === null || v === undefined) return '';
    return String(v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* Разбор даты в UTC-полночь. Работает с 'YYYY-MM-DD', ISO-строкой,
     'DD.MM.YYYY', числом и объектом Date. UTC исключает ошибки перевода часов. */
  function parseDay(value) {
    if (value === null || value === undefined || value === '') return null;
    if (value instanceof Date) {
      if (isNaN(value.getTime())) return null;
      return Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
    }
    if (typeof value === 'number') {
      var d = new Date(value);
      if (isNaN(d.getTime())) return null;
      return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    }
    var s = String(value).trim();
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
    if (m) return safeUTC(+m[1], +m[2] - 1, +m[3]);
    m = /^(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})/.exec(s);
    if (m) return safeUTC(+m[3], +m[2] - 1, +m[1]);
    var parsed = new Date(s);
    if (!isNaN(parsed.getTime())) {
      return Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    }
    return null;
  }

  /* Проверяем, что дата реальная: 2026-02-31 не должна молча стать 3 марта. */
  function safeUTC(y, mo, d) {
    if (mo < 0 || mo > 11 || d < 1 || d > 31) return null;
    var ts = Date.UTC(y, mo, d);
    var chk = new Date(ts);
    if (chk.getUTCFullYear() !== y || chk.getUTCMonth() !== mo || chk.getUTCDate() !== d) return null;
    return ts;
  }

  function todayUTC() {
    var n = new Date();
    return Date.UTC(n.getFullYear(), n.getMonth(), n.getDate());
  }

  function toISO(ts) {
    var d = new Date(ts);
    return d.getUTCFullYear() + '-' +
      pad2(d.getUTCMonth() + 1) + '-' +
      pad2(d.getUTCDate());
  }

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  function fmtDate(ts) {
    if (ts === null) return '—';
    var d = new Date(ts);
    return d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
  }

  function fmtDateShort(ts) {
    if (ts === null) return '—';
    var d = new Date(ts);
    return d.getUTCDate() + ' ' + MONTHS_SHORT[d.getUTCMonth()];
  }

  function fmtDateFull(ts) {
    if (ts === null) return '—';
    var d = new Date(ts);
    return pad2(d.getUTCDate()) + '.' + pad2(d.getUTCMonth() + 1) + '.' + d.getUTCFullYear();
  }

  function money(n) {
    var v = Number(n);
    if (!isFinite(v)) v = 0;
    try {
      return new Intl.NumberFormat('ru-RU').format(Math.round(v)) + ' ₽';
    } catch (e) {
      return String(Math.round(v)) + ' ₽';
    }
  }

  /* Склонение: 1 ночь / 2 ночи / 5 ночей */
  function plural(n, one, few, many) {
    var a = Math.abs(n) % 100;
    var b = a % 10;
    if (a > 10 && a < 20) return many;
    if (b > 1 && b < 5) return few;
    if (b === 1) return one;
    return many;
  }

  function nightsWord(n) { return n + ' ' + plural(n, 'ночь', 'ночи', 'ночей'); }

  function firstDefined() {
    for (var i = 0; i < arguments.length; i++) {
      if (arguments[i] !== undefined && arguments[i] !== null && arguments[i] !== '') return arguments[i];
    }
    return undefined;
  }

  function initials(name) {
    var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '—';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }

  /* ---------- Нормализация входных данных ---------- */

  function normalize(raw) {
    raw = raw || {};
    var warnings = [];

    var buildings = (raw.buildings || raw.dorms || []).map(function (b) {
      return { id: String(firstDefined(b.id, b.buildingId, b.code, b.name)), name: String(firstDefined(b.name, b.title, b.id)) };
    });

    var rooms = (raw.rooms || []).map(function (r) {
      return {
        id: String(firstDefined(r.id, r.roomId, r.number)),
        buildingId: r.buildingId !== undefined ? String(r.buildingId) : (r.building !== undefined ? String(r.building) : null),
        number: String(firstDefined(r.number, r.name, r.title, r.id)),
        name: firstDefined(r.name, r.title, '') || '',
        gender: (r.gender || r.sex || '').toString().toLowerCase().charAt(0) || ''
      };
    });

    var roomById = index(rooms);

    var beds = (raw.beds || raw.places || []).map(function (b) {
      return {
        id: String(firstDefined(b.id, b.bedId)),
        roomId: b.roomId !== undefined ? String(b.roomId) : (b.room !== undefined ? String(b.room) : null),
        label: String(firstDefined(b.label, b.code, b.name, b.id)),
        tier: String(firstDefined(b.tier, b.level, '')).toLowerCase()
      };
    });

    var residents = (raw.residents || raw.users || raw.clients || []).map(function (u) {
      return {
        id: String(firstDefined(u.id, u.userId)),
        name: String(firstDefined(u.name, u.fio, u.fullName, 'Без имени')),
        phone: firstDefined(u.phone, u.tel, '') || '',
        birthday: firstDefined(u.birthday, u.birthDate, u.dob, '') || '',
        docsSigned: u.docsSigned !== undefined ? !!u.docsSigned : (u.documents !== undefined ? !!u.documents : null),
        city: firstDefined(u.city, u.town, '') || '',
        university: firstDefined(u.university, u.vuz, u.school, '') || '',
        program: firstDefined(u.program, u.faculty, u.speciality, '') || '',
        contactPerson: firstDefined(u.contactPerson, u.contact, u.parent, '') || '',
        vk: firstDefined(u.vk, u.vkUrl, u.social, '') || '',
        photo: firstDefined(u.photo, u.avatar, u.image, '') || ''
      };
    });

    var residentById = index(residents);

    var bookings = [];
    (raw.bookings || []).forEach(function (b) {
      var from = parseDay(firstDefined(b.from, b.start, b.checkInDate, b.dateFrom));
      var to = parseDay(firstDefined(b.to, b.end, b.checkOutDate, b.dateTo));
      var id = String(firstDefined(b.id, b.bookingId));
      if (from === null || to === null) {
        warnings.push('Бронь ' + id + ': не удалось разобрать даты — пропущена.');
        return;
      }
      if (to < from) {
        warnings.push('Бронь ' + id + ': дата выезда раньше заезда — даты переставлены местами.');
        var t = from; from = to; to = t;
      }
      var bedId = b.bedId !== undefined ? String(b.bedId) : (b.bed !== undefined ? String(b.bed) : null);
      var residentId = firstDefined(b.residentId, b.userId, b.clientId);
      residentId = residentId === undefined ? null : String(residentId);

      bookings.push({
        id: id,
        bedId: bedId,
        residentId: residentId,
        from: from,
        to: to,
        checkIn: firstDefined(b.checkIn, '14:00'),
        checkOut: firstDefined(b.checkOut, '12:00'),
        status: b.status || null,
        source: firstDefined(b.source, '') || '',
        tariff: firstDefined(b.tariff, '') || '',
        accrued: Number(firstDefined(b.accrued, b.amount, b.total, 0)) || 0,
        paid: Number(firstDefined(b.paid, 0)) || 0,
        note: firstDefined(b.note, '') || '',
        bookedAt: parseDay(firstDefined(b.bookedAt, b.created, null))
      });
    });

    var payments = (raw.payments || []).map(function (p) {
      return {
        id: String(firstDefined(p.id, Math.random())),
        residentId: p.residentId !== undefined ? String(p.residentId) : (p.userId !== undefined ? String(p.userId) : null),
        bookingId: p.bookingId !== undefined ? String(p.bookingId) : null,
        period: firstDefined(p.period, p.title, '') || '',
        amount: Number(firstDefined(p.amount, p.sum, 0)) || 0,
        date: parseDay(firstDefined(p.date, p.paidAt, null)),
        kind: firstDefined(p.kind, '') || ''
      };
    });

    /* Проверка ссылочной целостности — тихо портящие картинку ошибки
       лучше показать явно, чем отрисовать пустую сетку. */
    var bedById = index(beds);
    bookings.forEach(function (b) {
      if (!bedById[b.bedId]) warnings.push('Бронь ' + b.id + ': место "' + b.bedId + '" не найдено в списке мест.');
      if (b.residentId !== null && !residentById[b.residentId]) {
        warnings.push('Бронь ' + b.id + ': проживающий "' + b.residentId + '" не найден.');
      }
    });
    beds.forEach(function (bd) {
      if (!roomById[bd.roomId]) warnings.push('Место ' + bd.id + ': комната "' + bd.roomId + '" не найдена.');
    });

    return {
      buildings: buildings, rooms: rooms, beds: beds,
      residents: residents, bookings: bookings, payments: payments,
      warnings: warnings,
      roomById: roomById, bedById: bedById, residentById: residentById,
      buildingById: index(buildings), bookingById: index(bookings)
    };
  }

  function index(list) {
    var map = {};
    for (var i = 0; i < list.length; i++) map[list[i].id] = list[i];
    return map;
  }

  /* ---------- Вычисление статуса ---------- */

  function statusOf(booking, today) {
    if (booking.status && STATUS_LABEL[booking.status]) return booking.status;
    var balance = booking.accrued - booking.paid;
    if (booking.to < today) return balance > 0.5 ? 'debt' : 'done';
    if (balance > 0.5) return 'debt';
    if (booking.from > today) return 'booked';
    if (booking.to - today <= 7 * DAY_MS) return 'leaving';
    return 'active';
  }

  /* ---------- Подсказка при наведении ---------- */

  var tipEl = null;
  var tipHideTimer = null;

  function ensureTip() {
    if (tipEl && tipEl.isConnected) return tipEl;
    tipEl = document.createElement('div');
    tipEl.className = 'msv-sh-tip';
    tipEl.setAttribute('role', 'tooltip');
    document.body.appendChild(tipEl);
    return tipEl;
  }

  function showTip(html, anchorRect) {
    var el = ensureTip();
    if (tipHideTimer) { clearTimeout(tipHideTimer); tipHideTimer = null; }
    el.innerHTML = html;
    el.style.visibility = 'hidden';
    el.classList.add('msv-sh-tip--on');

    var box = el.getBoundingClientRect();
    var gap = 8;
    var left = anchorRect.left;
    var top = anchorRect.top - box.height - gap;

    if (top < 8) top = anchorRect.bottom + gap;                       // не влезает сверху — вниз
    if (left + box.width > window.innerWidth - 8) {                   // не влезает справа — прижать
      left = window.innerWidth - box.width - 8;
    }
    if (left < 8) left = 8;

    el.style.left = Math.round(left) + 'px';
    el.style.top = Math.round(top) + 'px';
    el.style.visibility = 'visible';
  }

  function hideTip() {
    if (!tipEl) return;
    tipEl.classList.remove('msv-sh-tip--on');
    tipHideTimer = setTimeout(function () {
      if (tipEl) tipEl.style.visibility = 'hidden';
    }, 140);
  }

  /* ============================================================
     Экземпляр шахматки
     ============================================================ */

  function Shahmatka(root, rawData, options) {
    this.root = root;
    this.opts = Object.assign({
      title: 'Шахматка заселения',
      days: 35,
      zoom: 'm',
      start: null,
      showLegend: true,
      onEdit: null,
      onOpenProfile: null
    }, options || {});

    this.data = normalize(rawData);
    this.today = todayUTC();
    this.start = parseDay(this.opts.start) || startOfMonth(this.today);
    /* Инлайновый --sh-day-w перебивает медиазапрос, поэтому узкий экран
       определяем здесь, а не только в CSS. */
    if (!(options && options.zoom) && typeof window !== 'undefined' && window.innerWidth < 760) {
      this.opts.zoom = 's';
    }
    this.dayW = ZOOM[this.opts.zoom] || ZOOM.m;
    this.query = '';
    this.selectedId = null;
    this._handlers = [];

    root.classList.add('msv-sh');
    root.innerHTML = '';
    this._buildShell();
    this.refresh();
  }

  function startOfMonth(ts) {
    var d = new Date(ts);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
  }

  Shahmatka.prototype._on = function (el, type, fn, opts) {
    el.addEventListener(type, fn, opts);
    this._handlers.push([el, type, fn, opts]);
  };

  /* ---------- Каркас ---------- */

  Shahmatka.prototype._buildShell = function () {
    var self = this;

    var bar = document.createElement('div');
    bar.className = 'msv-sh__toolbar';
    bar.innerHTML =
      '<h2 class="msv-sh__title">' + esc(this.opts.title) + '</h2>' +
      '<button type="button" class="msv-sh__btn msv-sh__btn--icon" data-act="prev" aria-label="Предыдущий месяц">‹</button>' +
      '<button type="button" class="msv-sh__btn" data-act="today">Сегодня</button>' +
      '<button type="button" class="msv-sh__btn msv-sh__btn--icon" data-act="next" aria-label="Следующий месяц">›</button>' +
      '<input type="date" class="msv-sh__date" data-act="date" aria-label="Начало периода">' +
      '<span class="msv-sh__spacer"></span>' +
      '<input type="search" class="msv-sh__search" data-act="search" placeholder="Фамилия, комната или место" aria-label="Поиск">' +
      '<span class="msv-sh__zoom" role="group" aria-label="Масштаб">' +
        '<button type="button" class="msv-sh__btn" data-zoom="s">Мелко</button>' +
        '<button type="button" class="msv-sh__btn" data-zoom="m">Средне</button>' +
        '<button type="button" class="msv-sh__btn" data-zoom="l">Крупно</button>' +
      '</span>';
    this.root.appendChild(bar);
    this.toolbar = bar;

    if (this.opts.showLegend) {
      var lg = document.createElement('div');
      lg.className = 'msv-sh__legend';
      lg.innerHTML = ['booked', 'active', 'leaving', 'debt', 'done'].map(function (k) {
        return '<span class="msv-sh__legend-item">' +
          '<span class="msv-sh__swatch" style="background:var(--sh-' + k + '-bg);border-color:var(--sh-' + k + '-br)"></span>' +
          esc(STATUS_LABEL[k]) + '</span>';
      }).join('');
      this.root.appendChild(lg);
    }

    var scroll = document.createElement('div');
    scroll.className = 'msv-sh__scroll';
    scroll.innerHTML = '<div class="msv-sh__canvas"></div>';
    this.root.appendChild(scroll);
    this.scroll = scroll;
    this.canvas = scroll.querySelector('.msv-sh__canvas');

    var scrim = document.createElement('div');
    scrim.className = 'msv-sh__scrim';
    this.root.appendChild(scrim);
    this.scrim = scrim;

    var panel = document.createElement('aside');
    panel.className = 'msv-sh__panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'false');
    panel.setAttribute('aria-label', 'Карточка проживающего');
    panel.setAttribute('aria-hidden', 'true');
    this.root.appendChild(panel);
    this.panel = panel;

    /* --- обработчики --- */

    this._on(bar, 'click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      if (btn.dataset.zoom) {
        self.dayW = ZOOM[btn.dataset.zoom] || ZOOM.m;
        self.opts.zoom = btn.dataset.zoom;
        self.refresh();
        return;
      }
      var act = btn.dataset.act;
      if (act === 'prev') self.shiftMonth(-1);
      if (act === 'next') self.shiftMonth(1);
      if (act === 'today') self.setStart(startOfMonth(todayUTC()));
    });

    this._on(bar, 'change', function (e) {
      if (e.target.dataset.act === 'date') {
        var ts = parseDay(e.target.value);
        if (ts !== null) self.setStart(ts);
      }
    });

    this._searchTimer = null;
    this._on(bar, 'input', function (e) {
      if (e.target.dataset.act !== 'search') return;
      clearTimeout(self._searchTimer);
      var v = e.target.value;
      self._searchTimer = setTimeout(function () {
        self.query = v.trim().toLowerCase();
        self.refresh();
      }, 180);
    });

    /* Наведение и клик по полосам — делегированием, чтобы обработчиков
       было ровно два, а не по два на каждую бронь. */
    this._on(this.canvas, 'mouseover', function (e) {
      var bar2 = e.target.closest('.msv-sh__bar');
      if (!bar2 || !self.canvas.contains(bar2)) return;
      var b = self._bookingById(bar2.dataset.id);
      if (b) showTip(self._tipHTML(b), bar2.getBoundingClientRect());
    });

    this._on(this.canvas, 'mouseout', function (e) {
      var bar2 = e.target.closest('.msv-sh__bar');
      if (!bar2) return;
      if (e.relatedTarget && bar2.contains(e.relatedTarget)) return;
      hideTip();
    });

    this._on(this.canvas, 'focusin', function (e) {
      var bar2 = e.target.closest('.msv-sh__bar');
      if (!bar2) return;
      var b = self._bookingById(bar2.dataset.id);
      if (b) showTip(self._tipHTML(b), bar2.getBoundingClientRect());
    });

    this._on(this.canvas, 'focusout', function () { hideTip(); });
    this._on(this.scroll, 'scroll', function () { hideTip(); }, { passive: true });

    this._on(this.canvas, 'click', function (e) {
      var bar2 = e.target.closest('.msv-sh__bar');
      if (!bar2) return;
      self.openBooking(bar2.dataset.id);
    });

    this._on(this.canvas, 'keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var bar2 = e.target.closest('.msv-sh__bar');
      if (!bar2) return;
      e.preventDefault();
      self.openBooking(bar2.dataset.id);
    });

    this._on(scrim, 'click', function () { self.closePanel(); });

    this._on(panel, 'click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      if (btn.dataset.act === 'close') self.closePanel();
      if (btn.dataset.act === 'edit' && typeof self.opts.onEdit === 'function') {
        self.opts.onEdit(self._bookingById(self.selectedId));
      }
      if (btn.dataset.act === 'profile' && typeof self.opts.onOpenProfile === 'function') {
        var b = self._bookingById(self.selectedId);
        self.opts.onOpenProfile(b && self.data.residentById[b.residentId]);
      }
    });

    this._escHandler = function (e) {
      if (e.key === 'Escape') { hideTip(); self.closePanel(); }
    };
    this._on(document, 'keydown', this._escHandler);
  };

  /* ---------- Навигация ---------- */

  Shahmatka.prototype.shiftMonth = function (delta) {
    var d = new Date(this.start);
    this.setStart(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + delta, 1));
  };

  Shahmatka.prototype.setStart = function (value) {
    var ts = typeof value === 'number' ? value : parseDay(value);
    if (ts === null) return;
    this.start = ts;
    this.refresh();
  };

  Shahmatka.prototype.setData = function (rawData) {
    this.data = normalize(rawData);
    this.selectedId = null;
    this.closePanel();
    this.refresh();
  };

  /* Поиск по карте, а не перебором: подсказка вызывается на каждое
     наведение, а броней в общежитии могут быть тысячи. */
  Shahmatka.prototype._bookingById = function (id) {
    return this.data.bookingById[String(id)] || null;
  };

  /* ---------- Отрисовка сетки ---------- */

  Shahmatka.prototype.refresh = function () {
    var self = this;
    var d = this.data;
    var days = this.opts.days;
    var dayW = this.dayW;
    var start = this.start;
    var end = start + (days - 1) * DAY_MS;
    var today = this.today;
    var trackW = days * dayW;

    this.root.style.setProperty('--sh-day-w', dayW + 'px');

    // состояние элементов управления
    var dateInput = this.toolbar.querySelector('[data-act="date"]');
    if (dateInput) dateInput.value = toISO(start);
    Array.prototype.forEach.call(this.toolbar.querySelectorAll('[data-zoom]'), function (b) {
      b.setAttribute('aria-pressed', b.dataset.zoom === self.opts.zoom ? 'true' : 'false');
    });

    // брони по местам: отдельно все (для поиска) и отдельно видимые (для отрисовки)
    var byBed = {}, allByBed = {};
    d.bookings.forEach(function (b) {
      if (!allByBed[b.bedId]) allByBed[b.bedId] = [];
      allByBed[b.bedId].push(b);
      if (b.to < start || b.from > end) return;
      if (!byBed[b.bedId]) byBed[b.bedId] = [];
      byBed[b.bedId].push(b);
    });

    // фильтр поиска
    var q = this.query;
    function bedMatches(bed, room) {
      if (!q) return true;
      var hay = [bed.label, room ? room.number : '', room ? room.name : ''];
      (allByBed[bed.id] || []).forEach(function (b) {
        var r = d.residentById[b.residentId];
        if (r) hay.push(r.name);
      });
      return hay.join(' ').toLowerCase().indexOf(q) !== -1;
    }

    // группировка мест по корпусам
    var groups = [];
    var groupMap = {};
    d.beds.forEach(function (bed) {
      var room = d.roomById[bed.roomId];
      if (!bedMatches(bed, room)) return;
      var bid = room ? room.buildingId : null;
      var building = d.buildingById[bid];
      var key = building ? building.id : '__none__';
      if (!groupMap[key]) {
        groupMap[key] = { name: building ? building.name : 'Без корпуса', beds: [] };
        groups.push(groupMap[key]);
      }
      groupMap[key].beds.push({ bed: bed, room: room });
    });

    /* --- шапка --- */
    var head = '<div class="msv-sh__head">' +
      '<div class="msv-sh__head-left">Место</div>' +
      '<div class="msv-sh__head-track" style="width:' + trackW + 'px">' +
        '<div class="msv-sh__months">' + this._monthsHTML(start, days, dayW) + '</div>' +
        '<div class="msv-sh__days">' + this._daysHTML(start, days, today) + '</div>' +
      '</div></div>';

    /* --- подложка: выходные и линия «сегодня» --- */
    var under = '';
    for (var i = 0; i < days; i++) {
      var wd = new Date(start + i * DAY_MS).getUTCDay();
      if (wd === 0 || wd === 6) {
        under += '<div class="msv-sh__band" style="left:' + (i * dayW) + 'px;width:' + dayW + 'px"></div>';
      }
    }
    var todayIdx = Math.round((today - start) / DAY_MS);
    if (todayIdx >= 0 && todayIdx < days) {
      under += '<div class="msv-sh__nowline" style="left:' + (todayIdx * dayW + dayW / 2) + 'px"></div>';
    }

    /* --- строки --- */
    var rows = '';
    if (!groups.length) {
      rows = '<div class="msv-sh__empty"><b>Ничего не найдено</b>' +
        (q ? 'Измените запрос в поиске.' : 'Добавьте комнаты и места, чтобы увидеть шахматку.') + '</div>';
    } else {
      /* Считаем занятость на конкретный день. Если сегодняшний день попал
         в показанный период — на сегодня, иначе на первый день периода,
         иначе цифра относилась бы к дате, которой на экране нет. */
      var refDay = (today >= start && today <= end) ? today : start;
      var refLabel = refDay === today ? 'на сегодня' : ('на ' + fmtDateFull(refDay));

      groups.forEach(function (g) {
        var occupied = 0;
        g.beds.forEach(function (item) {
          var has = (allByBed[item.bed.id] || []).some(function (b) {
            return b.from <= refDay && b.to >= refDay;
          });
          if (has) occupied++;
        });
        rows += '<div class="msv-sh__group">' + esc(g.name) +
          '<span class="msv-sh__group-count" title="Занято мест ' + esc(refLabel) + '">' +
          occupied + ' из ' + g.beds.length + '</span></div>';

        g.beds.forEach(function (item) {
          rows += self._rowHTML(item, byBed[item.bed.id] || [], start, days, dayW, today, trackW);
        });
      });
    }

    this.canvas.innerHTML = head +
      '<div class="msv-sh__body">' +
        '<div class="msv-sh__underlay" style="width:' + trackW + 'px">' + under + '</div>' +
        rows +
      '</div>';

    if (d.warnings.length && global.console && console.warn) {
      console.warn('[Шахматка] Замечания по данным:\n· ' + d.warnings.join('\n· '));
    }
  };

  Shahmatka.prototype._monthsHTML = function (start, days, dayW) {
    var out = '';
    var i = 0;
    while (i < days) {
      var d0 = new Date(start + i * DAY_MS);
      var y = d0.getUTCFullYear(), m = d0.getUTCMonth();
      var span = 0;
      while (i + span < days) {
        var dn = new Date(start + (i + span) * DAY_MS);
        if (dn.getUTCFullYear() !== y || dn.getUTCMonth() !== m) break;
        span++;
      }
      out += '<div class="msv-sh__month" style="width:' + (span * dayW) + 'px">' +
        esc(MONTHS_NOM[m] + ' ' + y) + '</div>';
      i += span;
    }
    return out;
  };

  Shahmatka.prototype._daysHTML = function (start, days, today) {
    var out = '';
    for (var i = 0; i < days; i++) {
      var ts = start + i * DAY_MS;
      var d = new Date(ts);
      var wd = d.getUTCDay();
      var cls = 'msv-sh__day';
      if (wd === 0 || wd === 6) cls += ' msv-sh__day--weekend';
      if (ts === today) cls += ' msv-sh__day--today';
      out += '<div class="' + cls + '"><b>' + d.getUTCDate() + '</b><span>' + WEEKDAYS[wd] + '</span></div>';
    }
    return out;
  };

  /* Раскладка полос по «дорожкам»: если на одном месте брони пересекаются
     (обычно это ошибка данных), они не наезжают друг на друга, а встают
     в два ряда — так конфликт видно, а не спрятано. */
  function packLanes(bookings) {
    var sorted = bookings.slice().sort(function (a, b) { return a.from - b.from || a.to - b.to; });
    var laneEnds = [];
    sorted.forEach(function (b) {
      var placed = false;
      for (var i = 0; i < laneEnds.length; i++) {
        if (b.from >= laneEnds[i]) { b._lane = i; laneEnds[i] = b.to; placed = true; break; }
      }
      if (!placed) { b._lane = laneEnds.length; laneEnds.push(b.to); }
    });
    return { list: sorted, lanes: Math.max(1, laneEnds.length) };
  }

  Shahmatka.prototype._rowHTML = function (item, bookings, start, days, dayW, today, trackW) {
    var self = this;
    var d = this.data;
    var bed = item.bed, room = item.room;
    var end = start + (days - 1) * DAY_MS;

    var packed = packLanes(bookings);
    var laneH = 26;
    var rowH = Math.max(30, 4 + packed.lanes * laneH);

    var bars = '';
    packed.list.forEach(function (b) {
      var fromIdx = (b.from - start) / DAY_MS;
      var toIdx = (b.to - start) / DAY_MS;

      // полдня отступа: выезд и заезд в один день делят колонку
      var left = (fromIdx + 0.5) * dayW;
      var right = (toIdx + 0.5) * dayW;

      var cutL = left < 0, cutR = right > trackW;
      if (cutL) left = 0;
      if (cutR) right = trackW;

      var w = right - left;
      if (w < 6) w = 6;                      // очень короткие брони всё равно видны
      if (left + w > trackW) w = trackW - left;

      var st = statusOf(b, today);
      var res = d.residentById[b.residentId];
      var name = res ? res.name : 'Место свободно';
      var sub = b.source ? ', ' + b.source : '';

      var cls = 'msv-sh__bar msv-sh__bar--' + st;
      if (cutL) cls += ' msv-sh__bar--cut-left';
      if (cutR) cls += ' msv-sh__bar--cut-right';
      if (self.selectedId === b.id) cls += ' msv-sh__bar--selected';

      bars += '<div class="' + cls + '" data-id="' + esc(b.id) + '" tabindex="0" role="button" ' +
        'aria-label="' + esc(name + ', ' + fmtDateFull(b.from) + ' — ' + fmtDateFull(b.to)) + '" ' +
        'style="left:' + left.toFixed(1) + 'px;width:' + w.toFixed(1) + 'px;top:' + (4 + b._lane * laneH) + 'px">' +
        '<span class="msv-sh__bar-dot"></span>' +
        '<span class="msv-sh__bar-name">' + esc(name) + '</span>' +
        (sub ? '<span class="msv-sh__bar-sub">' + esc(sub) + '</span>' : '') +
        '</div>';
    });

    var g = room ? room.gender : '';
    var genderTag = '';
    if (g === 'ж' || g === 'f') genderTag = '<span class="msv-sh__tag msv-sh__tag--f">Ж</span>';
    else if (g === 'м' || g === 'm') genderTag = '<span class="msv-sh__tag msv-sh__tag--m">М</span>';

    return '<div class="msv-sh__row" style="height:' + rowH + 'px">' +
      '<div class="msv-sh__cell">' +
        genderTag +
        '<span class="msv-sh__bed">' + esc(bed.label) + '</span>' +
        '<span class="msv-sh__room">' + esc(room ? (room.name || ('к. ' + room.number)) : 'комната не указана') + '</span>' +
      '</div>' +
      '<div class="msv-sh__track" style="width:' + trackW + 'px">' + bars + '</div>' +
      '</div>';
  };

  /* ---------- Подсказка (по образцу скрина 4) ---------- */

  Shahmatka.prototype._tipHTML = function (b) {
    var d = this.data;
    var res = d.residentById[b.residentId];
    var bed = d.bedById[b.bedId];
    var room = bed ? d.roomById[bed.roomId] : null;
    var building = room ? d.buildingById[room.buildingId] : null;
    var balance = b.accrued - b.paid;
    var nights = Math.round((b.to - b.from) / DAY_MS);

    var place = [bed ? bed.label : null, room ? (room.name || ('к. ' + room.number)) : null,
                 building ? building.name : null].filter(Boolean).join(', ');

    var rows = [
      'Проживание: <b>' + esc(fmtDateShort(b.from)) + ' (' + esc(b.checkIn) + ') — ' +
        esc(fmtDateShort(b.to)) + ' (' + esc(b.checkOut) + ')</b>, ' + esc(nightsWord(nights)),
      'Гость: <b>' + esc(res ? res.name : 'не указан') + '</b>',
      'Место: ' + esc(place || 'не указано'),
      'Начислено: ' + esc(money(b.accrued)),
      'Оплачено: ' + esc(money(b.paid)),
      balance > 0.5
        ? 'Баланс: <span class="msv-sh-tip__debt">' + esc(money(balance)) + ' долг</span>'
        : 'Баланс: <b>' + esc(money(Math.abs(balance))) + (balance < -0.5 ? ' переплата' : '') + '</b>'
    ];

    if (b.source) rows.splice(3, 0, 'Источник: ' + esc(b.source));

    return '<ul><li>' + rows.join('</li><li>') + '</li></ul>';
  };

  /* ---------- Карточка проживающего (скрин 2 + поля скрина 3) ---------- */

  Shahmatka.prototype.openBooking = function (id) {
    var b = this._bookingById(id);
    if (!b) return;
    this.selectedId = b.id;

    var d = this.data;
    var res = d.residentById[b.residentId];
    var bed = d.bedById[b.bedId];
    var room = bed ? d.roomById[bed.roomId] : null;
    var building = room ? d.buildingById[room.buildingId] : null;
    var st = statusOf(b, this.today);
    var nights = Math.round((b.to - b.from) / DAY_MS);
    var balance = b.accrued - b.paid;

    var placeText = bed
      ? (bed.tier ? bed.tier + ' место' : 'место') +
        (room ? ' в комнате ' + (room.name || room.number) : '') +
        (building ? ', общежитие ' + building.name : '')
      : 'место не назначено';

    var titleParts = [bed ? bed.label : null, res ? res.name : 'Без имени', building ? building.name : null];

    var pays = d.payments.filter(function (p) {
      return (b.residentId !== null && p.residentId === b.residentId) || (p.bookingId && p.bookingId === b.id);
    }).sort(function (x, y) { return (y.date || 0) - (x.date || 0); });

    var avatar = res && res.photo
      ? '<img class="msv-sh__avatar" src="' + esc(safeUrl(res.photo)) + '" alt="">'
      : '<div class="msv-sh__avatar msv-sh__avatar--ph">' + esc(initials(res ? res.name : '')) + '</div>';

    /* value подставляется как HTML — экранирование на стороне вызывающего.
       Это позволяет вставлять ссылки, но требует esc() для любых данных. */
    function field(label, value, cls) {
      var empty = value === null || value === undefined || value === '';
      return '<div class="msv-sh__field">' +
        '<div class="msv-sh__label">' + esc(label) + '</div>' +
        '<div class="msv-sh__value ' + (empty ? 'msv-sh__value--empty' : (cls || '')) + '">' +
        (empty ? 'не указано' : value) + '</div></div>';
    }

    var vuz = [res && res.university, res && res.program].filter(Boolean).join(', ');

    function bdayText(r) {
      if (!r || !r.birthday) return '';
      var ts = parseDay(r.birthday);
      return ts === null ? '' : fmtDateFull(ts);   // нераспознанную дату не показываем прочерком
    }

    var html =
      '<div class="msv-sh__panel-head">' +
        '<h3 class="msv-sh__panel-title">' + esc(titleParts.filter(Boolean).join(' | ')) + '</h3>' +
        '<button type="button" class="msv-sh__panel-close" data-act="close" aria-label="Закрыть карточку">×</button>' +
      '</div>' +
      '<div class="msv-sh__panel-body">' +

        '<div class="msv-sh__sect"><div class="msv-sh__ident">' + avatar +
          '<div><div class="msv-sh__ident-name">' + esc(res ? res.name : 'Без имени') + '</div>' +
          '<div class="msv-sh__ident-sub"><span class="msv-sh__badge msv-sh__badge--' + st + '">' +
            esc(STATUS_LABEL[st]) + '</span></div></div>' +
        '</div></div>' +

        '<div class="msv-sh__sect">' +
          field('ФИО', esc(res ? res.name : '')) +
          field('Телефон', res && res.phone ? '<a href="tel:' + esc(String(res.phone).replace(/[^\d+]/g, '')) + '">' + esc(res.phone) + '</a>' : '') +
          field('Место', esc(placeText)) +
        '</div>' +

        '<div class="msv-sh__sect">' +
          '<dl class="msv-sh__pairs">' +
            '<dt>Заезд</dt><dd>' + esc(fmtDate(b.from)) + ', ' + esc(b.checkIn) + '</dd>' +
            '<dt>Выезд</dt><dd>' + esc(fmtDate(b.to)) + ', ' + esc(b.checkOut) + '</dd>' +
            '<dt>Ночей</dt><dd>' + nights + '</dd>' +
            (b.bookedAt !== null ? '<dt>Дата бронирования</dt><dd>' + esc(fmtDate(b.bookedAt)) + '</dd>' : '') +
            (b.tariff ? '<dt>Тариф</dt><dd>' + esc(b.tariff) + '</dd>' : '') +
            (b.source ? '<dt>Источник</dt><dd>' + esc(b.source) + '</dd>' : '') +
          '</dl>' +
        '</div>' +

        '<div class="msv-sh__sect">' +
          field('День рождения', esc(bdayText(res))) +
          field('Документы подписаны', res && res.docsSigned !== null && res.docsSigned !== undefined
            ? (res.docsSigned ? 'да' : 'нет') : '') +
          field('Город', esc(res ? res.city : '')) +
          field('ВУЗ', esc(vuz)) +
          field('Контактное лицо', esc(res ? res.contactPerson : '')) +
          field('Профиль в VK', res && res.vk
            ? '<a href="' + esc(safeUrl(res.vk)) + '" target="_blank" rel="noopener noreferrer">' + esc(res.vk) + '</a>' : '') +
        '</div>' +

        '<div class="msv-sh__sect">' +
          '<div class="msv-sh__sect-head"><span class="msv-sh__sect-title">История платежей</span></div>' +
          (pays.length
            ? '<table class="msv-sh__pay"><thead><tr><th>Период</th><th>Сумма</th><th>Дата платежа</th></tr></thead><tbody>' +
              pays.map(function (p) {
                return '<tr><td>' + esc(p.period || p.kind || '—') + '</td>' +
                  '<td>' + esc(money(p.amount)) + '</td>' +
                  '<td>' + esc(p.date !== null ? fmtDateFull(p.date) : '—') + '</td></tr>';
              }).join('') + '</tbody></table>'
            : '<div class="msv-sh__value msv-sh__value--empty">платежей пока нет</div>') +
        '</div>' +

        '<div class="msv-sh__sect">' +
          '<dl class="msv-sh__pairs">' +
            '<dt>Начислено за проживание</dt><dd>' + esc(money(b.accrued)) + '</dd>' +
            '<dt>Оплачено</dt><dd>' + esc(money(b.paid)) + '</dd>' +
            '<dt>Баланс</dt><dd class="' + (balance > 0.5 ? 'msv-sh__debt' : 'msv-sh__ok') + '">' +
              esc(money(Math.abs(balance))) + (balance > 0.5 ? ' к оплате' : (balance < -0.5 ? ' переплата' : '')) +
            '</dd>' +
          '</dl>' +
          (b.note ? '<div style="margin-top:12px">' + field('Заметка', esc(b.note)) + '</div>' : '') +
        '</div>' +

      '</div>' +
      '<div class="msv-sh__panel-foot">' +
        '<button type="button" class="msv-sh__btn msv-sh__btn--primary" data-act="edit">Изменить бронь</button>' +
        '<button type="button" class="msv-sh__btn" data-act="profile">Профиль</button>' +
      '</div>';

    this.panel.innerHTML = html;
    this.panel.classList.add('msv-sh__panel--on');
    this.panel.setAttribute('aria-hidden', 'false');
    this.scrim.classList.add('msv-sh__scrim--on');
    hideTip();

    var closeBtn = this.panel.querySelector('[data-act="close"]');
    if (closeBtn) closeBtn.focus();

    // подсветить выбранную полосу без полной перерисовки
    var prev = this.canvas.querySelector('.msv-sh__bar--selected');
    if (prev) prev.classList.remove('msv-sh__bar--selected');
    var cur = this.canvas.querySelector('.msv-sh__bar[data-id="' + cssEscape(b.id) + '"]');
    if (cur) cur.classList.add('msv-sh__bar--selected');
  };

  /* Ссылку из данных нельзя вставлять как есть: javascript:… — рабочий вектор атаки. */
  function safeUrl(u) {
    var s = String(u || '').trim();
    if (/^https?:\/\//i.test(s)) return s;
    if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(s)) return 'https://' + s;
    return '#';
  }

  function cssEscape(v) {
    return String(v).replace(/["\\]/g, '\\$&');
  }

  Shahmatka.prototype.closePanel = function () {
    if (!this.panel.classList.contains('msv-sh__panel--on')) return;
    this.panel.classList.remove('msv-sh__panel--on');
    this.panel.setAttribute('aria-hidden', 'true');
    this.scrim.classList.remove('msv-sh__scrim--on');
    this.selectedId = null;
    var prev = this.canvas.querySelector('.msv-sh__bar--selected');
    if (prev) prev.classList.remove('msv-sh__bar--selected');
  };

  Shahmatka.prototype.destroy = function () {
    this._handlers.forEach(function (h) { h[0].removeEventListener(h[1], h[2], h[3]); });
    this._handlers = [];
    if (this._searchTimer) { clearTimeout(this._searchTimer); this._searchTimer = null; }
    hideTip();
    this.root.innerHTML = '';
    this.root.classList.remove('msv-sh');
  };

  /* ---------- Точка входа ---------- */

  var API = {
    mount: function (target, data, options) {
      var el = typeof target === 'string' ? document.querySelector(target) : target;
      if (!el) throw new Error('MSVShahmatka: контейнер "' + target + '" не найден на странице.');
      return new Shahmatka(el, data, options);
    },

    /* Переходник для структуры db из app.js проекта МСВ.
       Если поля называются иначе — правьте здесь, а не в теле модуля. */
    fromMSV: function (db) {
      db = db || {};
      return {
        buildings: db.buildings || db.dorms || [],
        rooms: db.rooms || [],
        beds: db.beds || [],
        residents: db.users || db.residents || [],
        bookings: (db.bookings || []).map(function (b) {
          var charges = (db.charges || []).filter(function (c) {
            return String(c.bookingId) === String(b.id) || String(c.userId) === String(b.userId);
          });
          var pays = (db.payments || []).filter(function (p) {
            return String(p.userId) === String(b.userId);
          });
          return Object.assign({}, b, {
            residentId: b.userId,
            accrued: b.accrued !== undefined ? b.accrued : charges.reduce(function (s, c) { return s + (Number(c.amount) || 0); }, 0),
            paid: b.paid !== undefined ? b.paid : pays.reduce(function (s, p) { return s + (Number(p.amount) || 0); }, 0)
          });
        }),
        payments: (db.payments || []).map(function (p) {
          return Object.assign({}, p, { residentId: p.userId });
        })
      };
    },

    // экспортируем помощники — пригодятся при отладке
    _utils: { parseDay: parseDay, money: money, statusOf: statusOf, normalize: normalize },
    version: '1.0.0'
  };

  if (typeof module === 'object' && module.exports) module.exports = API;
  global.MSVShahmatka = API;

})(typeof window !== 'undefined' ? window : this);
