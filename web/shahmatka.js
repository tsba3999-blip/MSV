/* © 2026 МСВ. Все права защищены. Программа для ЭВМ охраняется ст. 1259, 1261 ГК РФ. Использование без разрешения правообладателя запрещено. Подробнее: /legal.html */
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
    holdfree: 'Бронь без оплаты',
    booked:  'Забронировано',
    active:  'Проживает',
    leaving: 'Скоро выезд',
    debt:    'Есть долг',
    done:    'Выехал'
  };

  var ZOOM = { s: 26, m: 40, l: 60 };          // ширина дня
  var ZOOM_M = { s: 64, m: 96, l: 132 };      // ширина месяца в режиме года

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

  /* Полных лет по календарю: делением на 365 возраст в день рождения
     плавает на сутки. */
  function fullYears(iso) {
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(iso || ''));
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3];
    var t = new Date();
    var age = t.getFullYear() - y;
    if ((t.getMonth() + 1) < mo || ((t.getMonth() + 1) === mo && t.getDate() < d)) age--;
    return age;
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
        tier: String(firstDefined(b.tier, b.level, '')).toLowerCase(),
        price: Number(firstDefined(b.price, 0)) || 0
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
        photo: firstDefined(u.photo, u.avatar, u.image, '') || '',
        messengers: Array.isArray(u.messengers) ? u.messengers.slice() : [],
        signedAt: firstDefined(u.signedAt, null),
        registrations: (u.registrations || []).map(function (r) {
          return {
            number: firstDefined(r.number, '') || '',
            issued: parseDay(firstDefined(r.issued, r.from, null)),
            until: parseDay(firstDefined(r.until, r.to, null)),
            address: firstDefined(r.address, r.place, '') || ''
          };
        }).sort(function (a, b) { return (b.issued || 0) - (a.issued || 0); })
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
        bookedAt: parseDay(firstDefined(b.bookedAt, b.created, null)),
        // бесплатная бронь: срок в часах, имя и контакт человека со стороны
        holdUntil: b.holdUntil || null,
        holdName: firstDefined(b.holdName, '') || '',
        holdContact: firstDefined(b.holdContact, '') || ''
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

  /* Срок бесплатной брони словами: «26 сентября, 18:00» */
  function holdWhen(v) {
    var t = new Date(v);
    if (isNaN(t)) return '';
    return t.getDate() + ' ' + MONTHS_SHORT[t.getMonth()] + ', ' +
      String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0');
  }

  /* ---------- Вычисление статуса ---------- */

  function statusOf(booking, today) {
    if (booking.holdUntil) return 'holdfree';      // бесплатная бронь — всегда серая
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

  /* ---------- Фото крупным планом ---------- */

  var photoBox = null;

  function showPhoto(res) {
    hidePhoto();
    if (!res) return;

    photoBox = document.createElement('div');
    photoBox.className = 'msv-sh-photo';
    photoBox.setAttribute('role', 'dialog');
    photoBox.setAttribute('aria-modal', 'true');
    photoBox.setAttribute('aria-label', 'Фото: ' + res.name);

    var inner = res.photo
      ? '<img src="' + esc(safeUrl(res.photo)) + '" alt="' + esc(res.name) + '">'
      : '<span class="msv-sh-photo__ph">' + esc(initials(res.name)) + '</span>';

    photoBox.innerHTML =
      '<button type="button" class="msv-sh-photo__close" aria-label="Закрыть">&times;</button>' +
      '<div class="msv-sh-photo__box">' + inner +
        '<span class="msv-sh-photo__cap">' + esc(res.name) + '</span>' +
      '</div>';

    document.body.appendChild(photoBox);

    photoBox.addEventListener('click', function (e) {
      // закрываем и по затемнению, и по крестику, но не по самому снимку
      if (e.target === photoBox || e.target.closest('.msv-sh-photo__close')) hidePhoto();
    });

    var close = photoBox.querySelector('.msv-sh-photo__close');
    if (close) close.focus();
  }

  function hidePhoto() {
    if (photoBox && photoBox.parentNode) photoBox.parentNode.removeChild(photoBox);
    photoBox = null;
  }

  /* ============================================================
     Экземпляр шахматки
     ============================================================ */

  function Shahmatka(root, rawData, options) {
    this.root = root;
    this.opts = Object.assign({
      title: 'Шахматка заселения',
      days: 35,
      months: 12,
      scale: 'day',            // 'day' — дни месяца, 'year' — месяцы года
      readOnly: false,         // true — смотреть можно, переселять нельзя
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
    this.collapsed = {};          // id комнаты -> свёрнута
    this.onlyFree = false;        // показывать только свободные сегодня места
    this._handlers = [];

    root.classList.add('msv-sh');
    if (this.opts.readOnly) root.classList.add('msv-sh--readonly');
    root.innerHTML = '';
    this._buildShell();
    this.refresh();
  }

  function startOfMonth(ts) {
    var d = new Date(ts);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
  }

  function daysInMonth(y, m) {
    return Math.round((Date.UTC(y, m + 1, 1) - Date.UTC(y, m, 1)) / DAY_MS);
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
      (this.opts.title ? '<h2 class="msv-sh__title">' + esc(this.opts.title) + '</h2>' : '') +
      '<button type="button" class="msv-sh__btn msv-sh__btn--icon" data-act="prev" aria-label="Предыдущий месяц">‹</button>' +
      '<button type="button" class="msv-sh__btn" data-act="today">Сегодня</button>' +
      '<button type="button" class="msv-sh__btn msv-sh__btn--icon" data-act="next" aria-label="Следующий месяц">›</button>' +
      '<input type="date" class="msv-sh__date" data-act="date" aria-label="Начало периода">' +
      '<button type="button" class="msv-sh__btn" data-act="scale" aria-pressed="false">Весь год</button>' +
      '<button type="button" class="msv-sh__btn" data-act="onlyfree" aria-pressed="false" title="Показать только свободные сегодня места">Только свободные</button>' +
      '<span class="msv-sh__spacer"></span>' +
      // Бесплатная бронь: нужна редко, поэтому стоит в углу и объясняет
      // себя подсказкой при наведении (решение заказчика 24.09.2026)
      '<button type="button" class="msv-sh__btn msv-sh__hold-btn" data-act="hold" aria-label="Забронировать место без оплаты">Забронировать' +
        '<span class="msv-sh__hold-tip" role="tooltip">Бесплатная бронь на 24 или 48 часов</span>' +
      '</button>' +
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
      if (act === 'prev') self.shift(-1);
      if (act === 'next') self.shift(1);
      if (act === 'today') self.setStart(startOfMonth(todayUTC()));
      if (act === 'scale') self.setScale(self.opts.scale === 'year' ? 'day' : 'year');
      if (act === 'onlyfree') { self.onlyFree = !self.onlyFree; self.refresh(); }
      if (act === 'hold') self.startHold();
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
      if (e.target.closest('[data-foldall]')) { self.foldAll(); return; }

      var fold = e.target.closest('[data-fold]');
      if (fold) {
        var id = fold.dataset.fold;
        self.collapsed[id] = !self.collapsed[id];
        self.refresh();
        // возвращаем внимание на ту же кнопку после перерисовки
        var again = self.canvas.querySelector('[data-fold="' + cssEscape(id) + '"]');
        if (again) again.focus();
        return;
      }
      var bar2 = e.target.closest('.msv-sh__bar');
      if (!bar2) return;
      if (self._justDragged) { self._justDragged = false; return; }
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
      if (btn.hasAttribute('data-photo')) {
        var cur = self._bookingById(self.selectedId);
        var r = cur && self.data.residentById[cur.residentId];
        showPhoto(r);
        return;
      }
      if (btn.dataset.act === 'close') self.closePanel();
      if (btn.dataset.act === 'unhold' && typeof self.opts.onUnhold === 'function') {
        self.opts.onUnhold(self._bookingById(self.selectedId));
        return;
      }
      if (btn.dataset.act === 'edit' && typeof self.opts.onEdit === 'function') {
        self.opts.onEdit(self._bookingById(self.selectedId));
      }
      if (btn.dataset.act === 'profile' && typeof self.opts.onOpenProfile === 'function') {
        var b = self._bookingById(self.selectedId);
        self.opts.onOpenProfile(b && self.data.residentById[b.residentId]);
      }
    });

    this._escHandler = function (e) {
      if (e.key === 'Escape') {
        if (self._drag && self._drag.active) { self._dragCancel(); return; }
        if (photoBox) { hidePhoto(); return; }
        hideTip(); self.closePanel();
      }
    };
    this._on(document, 'keydown', this._escHandler);

    this._initDrag();
  };

  /* ============================================================
     Перетаскивание брони на другое место

     Работает на мыши и на касании: pointer-события покрывают оба.
     Перетаскивание начинается только после сдвига на 5 пикселей —
     иначе обычный щелчок по полосе открывал бы карточку и тут же
     считался началом перетаскивания.
     ============================================================ */

  var DRAG_THRESHOLD = 5;

  Shahmatka.prototype._initDrag = function () {
    var self = this;
    this._drag = null;

    this._on(this.canvas, 'pointerdown', function (e) {
      if (self.opts.readOnly) return;                       // просмотр без переселений
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      var bar = e.target.closest('.msv-sh__bar');
      if (!bar || !self.canvas.contains(bar)) return;

      var booking = self._bookingById(bar.dataset.id);
      if (!booking) return;

      /* Гасим выделение текста: браузер начинал выделять подпись внутри
         полосы и присылал pointercancel, обрывая перенос до начала. */
      e.preventDefault();

      /* Захват указателя: дальше все события идут этой полосе, даже
         когда курсор уходит с неё или за край окна. */
      if (bar.setPointerCapture) {
        try { bar.setPointerCapture(e.pointerId); } catch (err) { /* не поддержано — работаем без захвата */ }
      }

      var track = bar.parentNode;
      var axis = self._axis();

      self._drag = {
        id: booking.id, bar: bar, active: false,
        x0: e.clientX, y0: e.clientY,
        pointerId: e.pointerId,
        fromBed: booking.bedId, target: null, ok: false,
        axis: axis, track: track,
        /* Точка отсчёта по горизонтали: где в сетке стоял курсор в момент
           захвата. Дальше сдвиг курсора переводится в число суток. */
        xRel0: e.clientX - track.getBoundingClientRect().left,
        shift: 0, newFrom: booking.from, newTo: booking.to
      };

      /* Пальцем бронь двигается только после удержания (0,4 с): иначе при
         прокрутке сетки бронь уезжала случайно (решение заказчика 22.09.2026).
         Мышью — как раньше, сразу. */
      if (e.pointerType !== 'mouse') {
        self._drag.hold = false;
        self._drag.holdTimer = setTimeout(function () {
          if (!self._drag) return;
          self._drag.hold = true;
          bar.classList.add('msv-sh__bar--hold');
          if (navigator.vibrate) { try { navigator.vibrate(12); } catch (err) {} }
        }, 400);
      } else {
        self._drag.hold = true;
      }

      // фокус ставим вручную: preventDefault выше его отменил
      bar.focus({ preventScroll: true });
    });

    this._moveHandler = function (e) { self._dragMove(e); };
    this._upHandler = function (e) { self._dragEnd(e); };

    this._on(document, 'pointermove', this._moveHandler);
    this._on(document, 'pointerup', this._upHandler);
    this._on(document, 'pointercancel', this._upHandler);
  };

  Shahmatka.prototype._dragMove = function (e) {
    var g = this._drag;
    if (!g || e.pointerId !== g.pointerId) return;

    if (!g.active) {
      var moved = Math.abs(e.clientX - g.x0) >= DRAG_THRESHOLD || Math.abs(e.clientY - g.y0) >= DRAG_THRESHOLD;
      if (!g.hold) {
        // палец повели раньше, чем удержали, — это прокрутка, а не перенос
        if (moved) { clearTimeout(g.holdTimer); g.bar.classList.remove('msv-sh__bar--hold'); this._drag = null; }
        return;
      }
      if (!moved) return;
      this._dragStart();
    }

    e.preventDefault();
    hideTip();

    g.ghost.style.left = e.clientX + 'px';
    g.ghost.style.top = e.clientY + 'px';

    this._dragAutoScroll(e);

    // ghost перекрывает точку под курсором — на миг убираем его
    g.ghost.style.display = 'none';
    var under = document.elementFromPoint(e.clientX, e.clientY);
    g.ghost.style.display = '';

    var row = under && under.closest ? under.closest('.msv-sh__row[data-bed]') : null;
    if (row && !this.canvas.contains(row)) row = null;

    /* Горизонталь: сколько суток отмерил курсор от точки захвата.
       Считаем через ось, а не делением на ширину колонки: в режиме
       года месяцы разной длины. */
    var xRel = e.clientX - g.track.getBoundingClientRect().left;
    var shift = Math.round((g.axis.tsAt(xRel) - g.axis.tsAt(g.xRel0)) / DAY_MS);

    var rowChanged = g.target !== row;
    var shiftChanged = shift !== g.shift;
    if (!rowChanged && !shiftChanged) return;

    g.shift = shift;

    if (rowChanged) g.target = row;

    if (!row) {
      g.ok = false;
      g.ghost.textContent = g.label;
      g.ghost.classList.remove('msv-sh-ghost--bad');
      this._dropPreview(null);
      return;
    }

    this._dragEvaluate(row);
  };

  /* Полоса-призрак ровно там, где бронь окажется: от нового заезда до
     нового выезда, с числом заезда на левом крае. Раньше подсвечивалась
     вся строка — было видно место, но не дата. */
  Shahmatka.prototype._dropPreview = function (row) {
    var g = this._drag;
    if (!g) return;

    if (g.preview && g.preview.parentNode) g.preview.parentNode.removeChild(g.preview);
    g.preview = null;
    if (g.markedRow) { g.markedRow.classList.remove('msv-sh__row--target'); g.markedRow = null; }
    if (!row) return;

    var track = row.querySelector('.msv-sh__track');
    if (!track) return;

    var left = g.axis.pos(g.newFrom);
    var right = g.axis.pos(g.newTo);
    var w = g.axis.width;

    var l = Math.max(0, Math.min(left, w));
    var r = Math.max(0, Math.min(right, w));
    if (r - l < 8) r = Math.min(w, l + 8);

    var el = document.createElement('div');
    el.className = 'msv-sh__preview' + (g.ok ? ' msv-sh__preview--ok' : ' msv-sh__preview--bad');
    el.style.left = l.toFixed(1) + 'px';
    el.style.width = (r - l).toFixed(1) + 'px';

    // Число заезда: слева от призрака, а у левого края сетки — справа,
    // иначе подпись уехала бы за границу.
    var side = l < 64 ? ' msv-sh__preview__day--inside' : '';
    el.innerHTML = '<span class="msv-sh__preview__day' + side + '">' +
      esc(fmtDateShort(g.newFrom)) + '</span>';

    track.appendChild(el);
    g.preview = el;

    row.classList.add('msv-sh__row--target');
    g.markedRow = row;
  };

  /* Считаем, что получится при отпускании: новое место и новые даты.
     Вертикаль меняет место, горизонталь двигает срок целиком —
     длительность проживания при этом не меняется. */
  Shahmatka.prototype._dragEvaluate = function (row) {
    var g = this._drag;
    if (!g || !g.ghost) return;

    var b = this._bookingById(g.id);
    if (!b) return;

    var bedId = row ? row.dataset.bed : g.fromBed;
    var sameBed = bedId === g.fromBed;
    var sameDates = g.shift === 0;

    g.newFrom = b.from + g.shift * DAY_MS;
    g.newTo = b.to + g.shift * DAY_MS;

    var bed = this.data.bedById[bedId];
    var room = bed ? this.data.roomById[bed.roomId] : null;
    var where = bed ? (bed.label + (room ? ' · ' + (room.name || ('к. ' + room.number)) : '')) : '';
    var when = fmtDateShort(g.newFrom) + ' — ' + fmtDateShort(g.newTo);

    if (sameBed && sameDates) {
      g.ok = false;
      g.ghost.textContent = 'Ничего не меняется';
      g.ghost.classList.remove('msv-sh-ghost--bad');
      this._dropPreview(null);
      return;
    }

    g.ok = this._canPlace(g.id, bedId, g.newFrom, g.newTo);
    this._dropPreview(row);

    var what;
    if (!g.ok) what = 'Занято: ' + where + ' · ' + when;
    else if (sameBed) what = 'Сдвинуть: ' + when;
    else if (sameDates) what = 'Переселить на ' + where;
    else what = 'На ' + where + ' · ' + when;

    g.ghost.textContent = what;
    g.ghost.classList.toggle('msv-sh-ghost--bad', !g.ok);
  };

  Shahmatka.prototype._dragStart = function () {
    var g = this._drag;
    g.active = true;

    var res = this.data.residentById[(this._bookingById(g.id) || {}).residentId];
    g.label = res ? res.name : g.bar.textContent.trim();

    var ghost = document.createElement('div');
    ghost.className = 'msv-sh-ghost';
    ghost.textContent = g.label;
    document.body.appendChild(ghost);

    g.ghost = ghost;
    g.bar.classList.add('msv-sh__bar--dragging');
    document.body.classList.add('msv-sh-dragging');
  };

  /* Когда курсор у края, прокручиваем сетку: иначе до дальней комнаты
     не дотянуться, не отпустив бронь. */
  Shahmatka.prototype._dragAutoScroll = function (e) {
    var box = this.scroll.getBoundingClientRect();
    var edge = 48, step = 14;

    if (e.clientY < box.top + edge) this.scroll.scrollTop -= step;
    else if (e.clientY > box.bottom - edge) this.scroll.scrollTop += step;

    if (e.clientX < box.left + edge) this.scroll.scrollLeft -= step;
    else if (e.clientX > box.right - edge) this.scroll.scrollLeft += step;
  };

  /* Место занято, если на нём есть бронь, пересекающаяся по датам.
     Сравнение строгое: выезд в 12:00 и заезд в 14:00 того же дня —
     обычная передача места, а не конфликт. Полосы в сетке в этот день
     тоже смыкаются, но не накладываются. */
  Shahmatka.prototype._canPlace = function (bookingId, bedId, from, to) {
    var b = this._bookingById(bookingId);
    if (!b || !this.data.bedById[bedId]) return false;
    return !this.data.bookings.some(function (x) {
      return x.id !== b.id && x.bedId === bedId && x.from < to && x.to > from;
    });
  };

  Shahmatka.prototype._canMove = function (bookingId, bedId) {
    var b = this._bookingById(bookingId);
    if (!b) return false;
    return this._canPlace(bookingId, bedId, b.from, b.to);
  };

  Shahmatka.prototype._dragEnd = function (e) {
    if (this._drag) { clearTimeout(this._drag.holdTimer); if (this._drag.bar) this._drag.bar.classList.remove('msv-sh__bar--hold'); }
    var g = this._drag;
    if (!g || (e && e.pointerId !== g.pointerId)) return;

    if (!g.active) { this._drag = null; return; }

    var pending = null;
    if (g.target && g.ok) {
      var b = this._bookingById(g.id);
      if (b) pending = { booking: b, toBed: g.target.dataset.bed, from: g.newFrom, to: g.newTo };
    }

    this._justDragged = true;      // ближайший click после перетаскивания гасим
    this._dragCleanup();
    if (pending) this._confirmMove(pending);
  };

  /* ============================================================
     Подтверждение переселения с перерасчётом

     Правило по умолчанию: стоимость меняется с даты переселения.
     За дни, прожитые на старом месте, — старая цена; за оставшиеся
     до конца оплаченного месяца — новая. Разница выводится как
     доплата или переплата. Оплаченная сумма не меняется — меняется
     то, что она покрывает.

     Формула на день: цена места / число дней в месяце. Правило легко
     заменить — оно в одном месте, функция recalc().
     ============================================================ */

  function daysBetween(a, b) { return Math.round((b - a) / DAY_MS); }

  Shahmatka.prototype._recalc = function (p) {
    var d = this.data;
    var b = p.booking;
    var oldBed = d.bedById[b.bedId], newBed = d.bedById[p.toBed];
    var oldPrice = oldBed ? oldBed.price : 0, newPrice = newBed ? newBed.price : 0;
    var today = this.today;

    // Переселение вступает в силу с сегодня или с нового заезда — что позже
    var since = Math.max(today, p.from);
    // Оплаченный период: до конца месяца, в котором сегодня
    var t = new Date(today);
    var monthEnd = Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 1) - DAY_MS;
    var periodEnd = Math.min(monthEnd, p.to);
    var daysInMonth = Math.round((Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 1) - Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 1)) / DAY_MS);

    var daysLeft = Math.max(0, daysBetween(since, periodEnd) + 1);
    var perDayOld = oldPrice / daysInMonth, perDayNew = newPrice / daysInMonth;
    var diff = Math.round((perDayNew - perDayOld) * daysLeft);

    return {
      oldBed: oldBed, newBed: newBed, oldPrice: oldPrice, newPrice: newPrice,
      daysLeft: daysLeft, diff: diff, since: since, periodEnd: periodEnd,
      datesChanged: p.from !== b.from || p.to !== b.to,
      bedChanged: p.toBed !== b.bedId
    };
  };

  Shahmatka.prototype._confirmMove = function (p) {
    var self = this;
    var r = this._recalc(p);
    var d = this.data;
    var res = d.residentById[p.booking.residentId];

    function place(bed) {
      if (!bed) return '—';
      var room = d.roomById[bed.roomId];
      return bed.label + (room ? ' · ' + (room.name || ('к. ' + room.number)) : '');
    }

    var rows = '';
    if (r.bedChanged) {
      rows += '<div class="msv-sh-confirm__row"><span>Место</span><b>' + esc(place(r.oldBed)) + ' → ' + esc(place(r.newBed)) + '</b></div>';
      rows += '<div class="msv-sh-confirm__row"><span>Цена в месяц</span><b>' + esc(money(r.oldPrice)) + ' → ' + esc(money(r.newPrice)) + '</b></div>';
    }
    if (r.datesChanged) {
      rows += '<div class="msv-sh-confirm__row"><span>Срок</span><b>' + esc(fmtDateShort(p.from)) + ' — ' + esc(fmtDateShort(p.to)) + '</b></div>';
    }

    var verdict;
    if (!r.bedChanged || r.oldPrice === r.newPrice) {
      verdict = '<p class="msv-sh-confirm__note">Цена не меняется, перерасчёта нет.</p>';
    } else if (r.daysLeft <= 0) {
      verdict = '<p class="msv-sh-confirm__note">Переселение в будущем месяце — новая цена начнёт действовать с него, перерасчёта за текущий нет.</p>';
    } else {
      var kind = r.diff > 0 ? 'Доплата' : 'Переплата';
      verdict = '<div class="msv-sh-confirm__sum' + (r.diff > 0 ? ' msv-sh-confirm__sum--pay' : ' msv-sh-confirm__sum--back') + '">' +
        '<span>' + kind + ' за ' + r.daysLeft + ' ' + esc(plural(r.daysLeft, 'день', 'дня', 'дней')) +
        ' до ' + esc(fmtDateShort(r.periodEnd)) + '</span><b>' + esc(money(Math.abs(r.diff))) + '</b></div>' +
        '<p class="msv-sh-confirm__note">С ' + esc(fmtDateShort(r.since)) + ' действует новая цена. Оплаченная сумма ' +
        esc(money(p.booking.paid)) + ' не меняется — меняется, что она покрывает.</p>';
    }

    var box = document.createElement('div');
    box.className = 'msv-sh-confirm';
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
    box.innerHTML = '<div class="msv-sh-confirm__box">' +
      '<h3 class="msv-sh-confirm__title">' + esc(res ? shortName(res.name) : 'Бронь') + ': ' +
        (r.bedChanged && r.datesChanged ? 'переселить и сдвинуть' : (r.bedChanged ? 'переселить' : 'сдвинуть даты')) + '?</h3>' +
      rows + verdict +
      '<div class="msv-sh-confirm__actions">' +
        '<button type="button" class="msv-sh__btn" data-act="cancel">Отмена</button>' +
        '<button type="button" class="msv-sh__btn msv-sh__btn--primary" data-act="ok">Подтвердить</button>' +
      '</div></div>';
    document.body.appendChild(box);

    function close() { if (box.parentNode) box.parentNode.removeChild(box); }

    box.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-act]');
      if (e.target === box || (btn && btn.dataset.act === 'cancel')) { close(); return; }
      if (btn && btn.dataset.act === 'ok') {
        close();
        var b = p.booking;
        var was = { bedId: b.bedId, from: b.from, to: b.to };
        b.bedId = p.toBed; b.from = p.from; b.to = p.to;
        if (typeof self.opts.onMove === 'function') {
          self.opts.onMove(b, was, { bedId: p.toBed, from: b.from, to: b.to }, r);
        }
        self.refresh();
      }
    });

    var ok = box.querySelector('[data-act="ok"]');
    if (ok) ok.focus();
  };

  Shahmatka.prototype._dragCancel = function () {
    if (!this._drag) return;
    this._dragCleanup();
  };

  Shahmatka.prototype._dragCleanup = function () {
    var g = this._drag;
    if (!g) return;
    if (g.bar && g.bar.releasePointerCapture && g.pointerId !== undefined) {
      try { g.bar.releasePointerCapture(g.pointerId); } catch (err) { /* уже отпущен */ }
    }
    if (g.ghost && g.ghost.parentNode) g.ghost.parentNode.removeChild(g.ghost);
    if (g.bar) g.bar.classList.remove('msv-sh__bar--dragging');
    if (g.preview && g.preview.parentNode) g.preview.parentNode.removeChild(g.preview);
    if (g.markedRow) g.markedRow.classList.remove('msv-sh__row--target');
    document.body.classList.remove('msv-sh-dragging');
    this._drag = null;
  };

  /* ---------- Навигация ---------- */

  /* В режиме дней листаем по месяцу, в режиме года — по году. */
  /* ---------- Бесплатная бронь ----------
     Нажали «Забронировать» — шахматка переходит в режим выбора: строки
     мест подсвечиваются, щелчок по свободному месту открывает окно с
     часами, именем и контактом. Esc отменяет. */

  Shahmatka.prototype.startHold = function () {
    var self = this;
    if (this._holdPick) return this.cancelHold();
    this._holdPick = true;
    this.root.classList.add('msv-sh--picking');

    var hint = document.createElement('div');
    hint.className = 'msv-sh__pickbar';
    hint.innerHTML = '<span>Выберите свободное место — на него встанет бронь без оплаты</span>' +
      '<button type="button" class="msv-sh__btn" data-act="pickcancel">Отмена</button>';
    this.root.insertBefore(hint, this.scroll);
    this._holdHint = hint;

    this._holdEsc = function (e) { if (e.key === 'Escape') self.cancelHold(); };
    document.addEventListener('keydown', this._holdEsc);

    this._holdClick = function (e) {
      if (e.target.closest('[data-act="pickcancel"]')) { self.cancelHold(); return; }
      var row = e.target.closest('.msv-sh__row');
      if (!row || !self._holdPick) return;
      e.preventDefault(); e.stopPropagation();
      var bedId = row.getAttribute('data-bed');
      if (self._bedBusyToday(bedId)) { self._holdSay('Это место сейчас занято — выберите свободное.'); return; }
      self.cancelHold();
      self.askHold(bedId);
    };
    this.root.addEventListener('click', this._holdClick, true);
  };

  Shahmatka.prototype.cancelHold = function () {
    this._holdPick = false;
    this.root.classList.remove('msv-sh--picking');
    if (this._holdHint) { this._holdHint.remove(); this._holdHint = null; }
    if (this._holdEsc) { document.removeEventListener('keydown', this._holdEsc); this._holdEsc = null; }
    if (this._holdClick) { this.root.removeEventListener('click', this._holdClick, true); this._holdClick = null; }
  };

  Shahmatka.prototype._holdSay = function (text) {
    if (this._holdHint) this._holdHint.querySelector('span').textContent = text;
  };

  /* Занято ли место прямо сейчас — по тем же броням, что рисует шахматка */
  Shahmatka.prototype._bedBusyToday = function (bedId) {
    var today = todayUTC();
    return (this.data.bookings || []).some(function (b) {
      return b.bedId === bedId && b.from <= today && b.to >= today;
    });
  };

  /* Окно: 24 или 48 часов, имя и контакт */
  Shahmatka.prototype.askHold = function (bedId) {
    var self = this;
    var bed = null, room = null;
    (this.data.beds || []).forEach(function (x) { if (x.id === bedId) bed = x; });
    (this.data.rooms || []).forEach(function (r) { if (bed && r.id === bed.roomId) room = r; });
    var where = (room ? room.name + ' · ' : '') + (bed ? bed.label : bedId);

    var box = document.createElement('div');
    box.className = 'msv-sh__holdmodal';
    box.innerHTML =
      '<div class="msv-sh__holdcard" role="dialog" aria-label="Бронь без оплаты">' +
        '<h2 class="msv-sh__holdtitle">Бронь без оплаты</h2>' +
        '<p class="msv-sh__holdplace">' + esc(where) + '</p>' +
        '<span class="msv-sh__holdlabel">На сколько держим место</span>' +
        '<div class="msv-sh__switch" role="group" aria-label="На сколько часов">' +
          '<button type="button" data-h="24" aria-pressed="true">24 часа</button>' +
          '<button type="button" data-h="48" aria-pressed="false">48 часов</button>' +
        '</div>' +
        '<label class="msv-sh__holdfield"><span>Имя</span><input type="text" id="shHoldName" placeholder="Кому держим место"></label>' +
        '<label class="msv-sh__holdfield"><span>Почта или Телеграм</span><input type="text" id="shHoldContact" placeholder="name@mail.ru или @nick"></label>' +
        '<p class="msv-sh__holdnote">За четыре часа до конца брони на почту придёт напоминание. По телеграм-нику написать сможем только тому, кто уже переписывался с ботом, — иначе напомним администрации.</p>' +
        '<p class="msv-sh__holderr" id="shHoldErr" hidden></p>' +
        '<div class="msv-sh__holdfoot">' +
          '<button type="button" class="msv-sh__btn msv-sh__btn--primary" id="shHoldOk">Забронировать</button>' +
          '<button type="button" class="msv-sh__btn" id="shHoldNo">Отмена</button>' +
        '</div>' +
      '</div>';
    this.root.appendChild(box);   // внутрь .msv-sh: там объявлена палитра

    var hours = 24;
    box.querySelectorAll('[data-h]').forEach(function (b) {
      b.addEventListener('click', function () {
        hours = Number(b.dataset.h);
        box.querySelectorAll('[data-h]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      });
    });
    function close() { box.remove(); }
    box.querySelector('#shHoldNo').addEventListener('click', close);
    box.addEventListener('click', function (e) { if (e.target === box) close(); });
    box.querySelector('#shHoldName').focus();

    box.querySelector('#shHoldOk').addEventListener('click', function () {
      var err = box.querySelector('#shHoldErr');
      var name = box.querySelector('#shHoldName').value.trim();
      var contact = box.querySelector('#shHoldContact').value.trim();
      if (!name) { err.textContent = 'Напишите имя — на кого держим место.'; err.hidden = false; return; }
      if (typeof self.opts.onHold !== 'function') { err.textContent = 'Бронь без оплаты работает только с сервером.'; err.hidden = false; return; }
      err.hidden = true;
      self.opts.onHold({ bedId: bedId, hours: hours, name: name, contact: contact }, function (msg) {
        if (msg) { err.textContent = msg; err.hidden = false; return; }
        close();
      });
    });
  };

  Shahmatka.prototype.shift = function (delta) {
    var d = new Date(this.start);
    var step = this.opts.scale === 'year' ? 3 : 1;   // в режиме года — кварталами
    this.setStart(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + delta * step, 1));
  };

  // прежнее имя оставлено, чтобы не ломать сторонние вызовы
  Shahmatka.prototype.shiftMonth = Shahmatka.prototype.shift;

  /* Свернуть все комнаты, а если все уже свёрнуты — развернуть. */
  Shahmatka.prototype.foldAll = function () {
    var ids = [];
    var self = this;
    this.data.rooms.forEach(function (r) { ids.push(r.id); });
    var everyFolded = ids.length > 0 && ids.every(function (id) { return !!self.collapsed[id]; });
    ids.forEach(function (id) { self.collapsed[id] = !everyFolded; });
    this.refresh();
    var btn = this.canvas.querySelector('[data-foldall]');
    if (btn) btn.focus();
  };

  Shahmatka.prototype.setScale = function (scale) {
    if (scale !== 'day' && scale !== 'year') return;
    this.opts.scale = scale;
    /* Год отсчитывается от текущего месяца, а не от января: иначе
       после декабря картина обрывалась бы, хотя договоры идут дальше. */
    this.start = startOfMonth(scale === 'year' ? todayUTC() : this.start);
    this.refresh();
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

  /* ---------- Ось времени ----------
     Один расчёт на оба режима: колонки, общая ширина и функция,
     переводящая дату в положение по горизонтали. В режиме дней
     колонка — сутки, в режиме года — месяц, и месяцы разной длины,
     поэтому положение внутри месяца берётся долей от его дней. */

  Shahmatka.prototype._axis = function () {
    var year = this.opts.scale === 'year';
    var cols = [];
    var x = 0;

    if (year) {
      var w = ZOOM_M[this.opts.zoom] || ZOOM_M.m;
      /* Отсчёт от выбранного месяца, а не от января: Date.UTC сам
         переносит номер месяца через границу года, поэтому после
         декабря идёт январь следующего. */
      var d0 = new Date(this.start);
      var baseY = d0.getUTCFullYear(), baseM = d0.getUTCMonth();
      for (var i = 0; i < this.opts.months; i++) {
        var mts = Date.UTC(baseY, baseM + i, 1);
        var md = new Date(mts);
        var yy = md.getUTCFullYear(), mm = md.getUTCMonth();
        cols.push({
          ts: mts,
          end: Date.UTC(yy, mm + 1, 1) - DAY_MS,
          days: daysInMonth(yy, mm), x: x, w: w,
          label: MONTHS_NOM[mm], sub: '',      // год стоит в верхней строке
          group: String(yy), weekend: false
        });
        x += w;
      }
    } else {
      var dw = ZOOM[this.opts.zoom] || ZOOM.m;
      for (var k = 0; k < this.opts.days; k++) {
        var ts = this.start + k * DAY_MS;
        var d = new Date(ts);
        var wd = d.getUTCDay();
        cols.push({
          ts: ts, end: ts, days: 1, x: x, w: dw,
          label: String(d.getUTCDate()), sub: WEEKDAYS[wd],
          group: MONTHS_NOM[d.getUTCMonth()] + ' ' + d.getUTCFullYear(),
          weekend: wd === 0 || wd === 6
        });
        x += dw;
      }
    }

    var first = cols[0], last = cols[cols.length - 1];

    function pos(ts) {
      if (!year) return ((ts - first.ts) / DAY_MS + 0.5) * first.w;
      // до начала и после конца — линейно продолжаем крайним месяцем
      if (ts < first.ts) return ((ts - first.ts) / DAY_MS / first.days) * first.w;
      for (var i = 0; i < cols.length; i++) {
        var c = cols[i];
        if (ts <= c.end) {
          var inside = (ts - c.ts) / DAY_MS;
          return c.x + ((inside + 0.5) / c.days) * c.w;
        }
      }
      var over = (ts - last.end) / DAY_MS;
      return last.x + last.w + (over / last.days) * last.w;
    }

    /* Обратная к pos: по положению возвращает дату. Нужна, чтобы
       перевести горизонтальный сдвиг курсора в число суток. */
    function tsAt(px) {
      if (!year) return first.ts + Math.round(px / first.w - 0.5) * DAY_MS;
      if (px < 0) return first.ts + Math.round((px / first.w) * first.days) * DAY_MS;
      for (var i = 0; i < cols.length; i++) {
        var c = cols[i];
        if (px < c.x + c.w) {
          return c.ts + Math.round(((px - c.x) / c.w) * c.days - 0.5) * DAY_MS;
        }
      }
      var over = (px - (last.x + last.w)) / last.w;
      return last.end + Math.round(over * last.days) * DAY_MS;
    }

    return {
      year: year, cols: cols, width: x, pos: pos, tsAt: tsAt,
      from: first.ts, to: last.end
    };
  };

  /* ---------- Отрисовка сетки ---------- */

  Shahmatka.prototype.refresh = function () {
    var self = this;
    var d = this.data;
    var axis = this._axis();
    var start = axis.from;
    var end = axis.to;
    var today = this.today;
    var trackW = axis.width;

    this.root.style.setProperty('--sh-day-w', (axis.cols[0] ? axis.cols[0].w : 40) + 'px');

    // состояние элементов управления
    var dateInput = this.toolbar.querySelector('[data-act="date"]');
    if (dateInput) dateInput.value = toISO(start);
    Array.prototype.forEach.call(this.toolbar.querySelectorAll('[data-zoom]'), function (b) {
      b.setAttribute('aria-pressed', b.dataset.zoom === self.opts.zoom ? 'true' : 'false');
    });
    var freeBtn = this.toolbar.querySelector('[data-act="onlyfree"]');
    if (freeBtn) freeBtn.setAttribute('aria-pressed', this.onlyFree ? 'true' : 'false');
    var scaleBtn = this.toolbar.querySelector('[data-act="scale"]');
    if (scaleBtn) scaleBtn.setAttribute('aria-pressed', axis.year ? 'true' : 'false');

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

    /* Группируем по комнатам, а не по корпусам: в шахматке одной
       резиденции корпус всегда один, а комната — та единица, которую
       администратор сворачивает и разворачивает. */
    var groups = [];
    var groupMap = {};
    d.beds.forEach(function (bed) {
      var room = d.roomById[bed.roomId];
      if (!bedMatches(bed, room)) return;
      if (self.onlyFree && (allByBed[bed.id] || []).some(function (b) { return b.from <= today && b.to >= today; })) return;
      var key = room ? room.id : '__none__';
      if (!groupMap[key]) {
        groupMap[key] = {
          id: key,
          room: room,
          name: room ? (room.name || ('Комната ' + room.number)) : 'Без комнаты',
          beds: []
        };
        groups.push(groupMap[key]);
      }
      groupMap[key].beds.push({ bed: bed, room: room });
    });

    /* Все ли комнаты свёрнуты — от этого зависит вид кнопки в углу */
    var allFolded = groups.length > 0 && groups.every(function (g) {
      return !!self.collapsed[g.id];
    });

    /* --- шапка --- */
    var head = '<div class="msv-sh__head">' +
      '<div class="msv-sh__head-left">' +
        '<button type="button" class="msv-sh__foldall" data-foldall ' +
          'aria-pressed="' + (allFolded ? 'true' : 'false') + '" ' +
          'title="' + (allFolded ? 'Развернуть все комнаты' : 'Свернуть все комнаты') + '" ' +
          'aria-label="' + (allFolded ? 'Развернуть все комнаты' : 'Свернуть все комнаты') + '">' +
          '<svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" ' +
          'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<path d="M5 11l5-5 5 5"/><path d="M5 16l5-5 5 5"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="msv-sh__head-track" style="width:' + trackW + 'px">' +
        '<div class="msv-sh__months">' + this._groupsHTML(axis) + '</div>' +
        '<div class="msv-sh__days">' + this._colsHTML(axis, today) + '</div>' +
      '</div></div>';

    /* --- подложка: выходные и линия «сегодня» --- */
    var under = '';
    axis.cols.forEach(function (c, i) {
      if (c.weekend) {
        under += '<div class="msv-sh__band" style="left:' + c.x + 'px;width:' + c.w + 'px"></div>';
      }
      // граница колонки продолжает разделитель из шапки на всю высоту
      if (i < axis.cols.length - 1) {
        under += '<div class="msv-sh__gridline" style="left:' + (c.x + c.w) + 'px"></div>';
      }
    });
    if (today >= start && today <= end) {
      under += '<div class="msv-sh__nowline" style="left:' + axis.pos(today).toFixed(1) + 'px"></div>';
    }

    /* --- строки --- */
    var rows = '';
    if (!groups.length) {
      rows = '<div class="msv-sh__empty"><b>Ничего не найдено</b>' +
        (q ? 'Измените запрос в поиске.' : 'Добавьте комнаты и места, чтобы увидеть шахматку.') + '</div>';
    } else {
      groups.forEach(function (g) {
        var open = !self.collapsed[g.id];
        var sex = g.room ? g.room.gender : '';
        var tag = '';
        if (sex === 'ж' || sex === 'f') tag = '<span class="msv-sh__tag msv-sh__tag--f">Ж</span>';
        else if (sex === 'м' || sex === 'm') tag = '<span class="msv-sh__tag msv-sh__tag--m">М</span>';

        rows += '<div class="msv-sh__group">' +
          '<span class="msv-sh__group-head">' +
            '<span class="msv-sh__group-name">' + esc(g.name) + '</span>' +
            tag +                                   // «№12 Сочи М»: название, затем пол
            '<button type="button" class="msv-sh__fold" data-fold="' + esc(g.id) + '" ' +
              'aria-expanded="' + (open ? 'true' : 'false') + '" ' +
              'aria-label="' + (open ? 'Свернуть' : 'Развернуть') + ' ' + esc(g.name) + '">' +
              '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">' +
              '<path d="M3 10l5-5 5 5" fill="none" stroke="currentColor" stroke-width="2" ' +
              'stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            '</button>' +
          '</span></div>';

        if (!open) return;

        g.beds.forEach(function (item) {
          rows += self._rowHTML(item, byBed[item.bed.id] || [], axis, today);
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

  /* Верхняя строка шапки: месяц с годом в режиме дней, год в режиме года */
  Shahmatka.prototype._groupsHTML = function (axis) {
    var out = '';
    var i = 0;
    while (i < axis.cols.length) {
      var name = axis.cols[i].group;
      var w = 0;
      while (i < axis.cols.length && axis.cols[i].group === name) {
        w += axis.cols[i].w; i++;
      }
      out += '<div class="msv-sh__month" style="width:' + w + 'px">' + esc(name) + '</div>';
    }
    return out;
  };

  /* Нижняя строка шапки: числа с днями недели или месяцы */
  Shahmatka.prototype._colsHTML = function (axis, today) {
    return axis.cols.map(function (c) {
      var cls = 'msv-sh__day';
      if (c.weekend) cls += ' msv-sh__day--weekend';
      if (today >= c.ts && today <= c.end) cls += ' msv-sh__day--today';
      return '<div class="' + cls + '" style="width:' + c.w + 'px;flex:0 0 ' + c.w + 'px">' +
             '<b>' + esc(c.label) + '</b>' +
             (c.sub ? '<span>' + esc(c.sub) + '</span>' : '') + '</div>';
    }).join('');
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

  /* Красная метка дня рождения на полосе. Ищем день рождения в каждом
     году, который захватывает бронь, и ставим метку, если он попал
     и в бронь, и в показанный период. */
  function birthdayMark(res, b, axis, barLeft, barW) {
    if (!res || !res.birthday) return '';
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(res.birthday));
    if (!m) return '';
    var mo = +m[2] - 1, d = +m[3];
    var y0 = new Date(Math.max(b.from, axis.from)).getUTCFullYear();
    var y1 = new Date(Math.min(b.to, axis.to)).getUTCFullYear();
    var out = '';
    for (var y = y0; y <= y1; y++) {
      var ts = Date.UTC(y, mo, d);
      if (new Date(ts).getUTCDate() !== d) continue;       // 29 февраля в невисокосный год
      if (ts < b.from || ts > b.to || ts < axis.from || ts > axis.to) continue;
      var x = axis.pos(ts) - barLeft;
      if (x < 4 || x > barW - 4) continue;
      out += '<span class="msv-sh__bday" style="left:' + x.toFixed(1) + 'px" ' +
        'title="День рождения ' + d + ' ' + esc(MONTHS[mo]) + '"></span>';
    }
    return out;
  }

  /* Двухъярусная кровать: две полки, занятая — залита. Верхнее место —
     залита верхняя, нижнее — нижняя. У равноценных мест иконки нет. */
  function tierIcon(tier) {
    var t = String(tier || '').toLowerCase();
    var top = t.indexOf('верх') === 0, low = t.indexOf('ниж') === 0;
    if (!top && !low) return '';
    var name = top ? 'Верхнее место' : 'Нижнее место';
    // Двухъярусная кровать сбоку: две полки, человек лежит на нужной
    return '<svg class="msv-sh__tier" viewBox="0 0 22 16" width="22" height="16" role="img" aria-label="' + name + '">' +
      '<title>' + name + '</title>' +
      '<path d="M2.5 1v14M19.5 1v14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
      '<path d="M2.5 6.5h17M2.5 13h17" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity=".55"/>' +
      (top
        ? '<rect x="4" y="3.2" width="14" height="3" rx="1.2" fill="currentColor"/><circle cx="6.5" cy="2.4" r="1.6" fill="currentColor"/>'
        : '<rect x="4" y="9.7" width="14" height="3" rx="1.2" fill="currentColor"/><circle cx="6.5" cy="8.9" r="1.6" fill="currentColor"/>') +
      '</svg>';
  }



  /* Фамилия и имя без отчества: в узкой полосе отчество съедает место,
     а полное имя всё равно есть в подсказке и в карточке. */
  function shortName(full) {
    var parts = String(full || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length <= 2) return parts.join(' ');
    return parts[0] + ' ' + parts[1];
  }

  Shahmatka.prototype._rowHTML = function (item, bookings, axis, today) {
    var self = this;
    var d = this.data;
    var bed = item.bed, room = item.room;
    var trackW = axis.width;

    var packed = packLanes(bookings);
    var laneH = 26;
    var rowH = Math.max(30, 4 + packed.lanes * laneH);

    var bars = '';
    packed.list.forEach(function (b) {
      var left = axis.pos(b.from);
      var right = axis.pos(b.to);

      var cutL = left < 0, cutR = right > trackW;
      if (cutL) left = 0;
      if (cutR) right = trackW;

      var w = right - left;
      if (w < 6) w = 6;                      // очень короткие брони всё равно видны
      if (left + w > trackW) w = trackW - left;
      if (w <= 0) return;

      var st = statusOf(b, today);
      var res = d.residentById[b.residentId];
      /* У бесплатной брони резидента нет: имя и срок пришли с сервера */
      var name = b.holdUntil ? (b.holdName || 'Бронь') : (res ? shortName(res.name) : 'Место свободно');
      var sub = b.holdUntil ? ('до ' + holdWhen(b.holdUntil)) : (res && res.university ? res.university : '');

      var bday = birthdayMark(res, b, axis, left, w);

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
        bday +
        '</div>';
    });

    /* Пол, номер и название комнаты уже стоят в её заголовке —
       в строке места они не повторяются. */
    return '<div class="msv-sh__row" data-bed="' + esc(bed.id) + '" style="height:' + rowH + 'px">' +
      '<div class="msv-sh__cell">' +
        '<span class="msv-sh__bed">' + esc(bed.label) + '</span>' +
        tierIcon(bed.tier) +
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

    // Резиденция в заголовке не повторяется: она уже стоит над шахматкой
    var titleParts = [bed ? bed.label : null, res ? res.name : 'Без имени'];

    var pays = d.payments.filter(function (p) {
      return (b.residentId !== null && p.residentId === b.residentId) || (p.bookingId && p.bookingId === b.id);
    }).sort(function (x, y) { return (y.date || 0) - (x.date || 0); });

    var who = res ? res.name : 'Без имени';
    var avatar = '<button type="button" class="msv-sh__avatar-btn" data-photo ' +
      'aria-label="Показать фото крупно">' +
      (res && res.photo
        ? '<img class="msv-sh__avatar" src="' + esc(safeUrl(res.photo)) + '" alt="' + esc(who) + '">'
        : '<span class="msv-sh__avatar msv-sh__avatar--ph">' + esc(initials(who)) + '</span>') +
      '</button>';

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

    function upFirst(text) {
      var t = String(text || '');
      return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
    }

    function phoneHTML(r) {
      if (!r || !r.phone) return '';
      var digits = phoneDigits(r.phone);
      var out = '<span class="msv-sh__phone">' +
        '<a href="tel:+' + esc(digits) + '">' + esc(r.phone) + '</a></span>';
      // Лепестки Telegram и Max — всегда оба. Если резидент указал мессенджер в
      // анкете — лепесток активный (графит) и открывает чат; если нет — бледный, без ссылки.
      var have = {};
      (r.messengers || []).forEach(function (key) { have[String(key).toLowerCase()] = true; });
      var petals = '';
      ['tg', 'max'].forEach(function (k) {
        var m = MESSENGERS[k], label = k === 'tg' ? 'Telegram' : 'Max';
        if (have[k] && m && digits) {
          petals += '<a class="msv-sh__petal msv-sh__petal--' + k + ' msv-sh__petal--on" href="' + esc(m.url(digits)) +
                    '" target="_blank" rel="noopener noreferrer" title="' + esc(m.title) + '">' + label + '</a>';
        } else {
          petals += '<span class="msv-sh__petal msv-sh__petal--' + k + ' msv-sh__petal--off" title="Не указан в анкете">' + label + '</span>';
        }
      });
      return out + '<span class="msv-sh__petals">' + petals + '</span>';
    }

    function bdayHTML(r) {
      if (!r || !r.birthday) return '';
      var ts = parseDay(r.birthday);
      if (ts === null) return '';               // нераспознанную дату не показываем прочерком
      var age = fullYears(r.birthday);
      var out = esc(fmtDateFull(ts));
      if (age !== null && age >= 0) {
        out += ' <span class="msv-sh__age">' + age + ' ' +
               esc(plural(age, 'год', 'года', 'лет')) + '</span>';
        if (age < 18) out += '<span class="msv-sh__minor">Несовершеннолетний</span>';
      }
      return out;
    }

    /* Все выданные регистрации, свежая сверху. У действующей отмечается
       срок окончания, у просроченной — что она истекла. */
    function migrationHTML(r) {
      var list = (r && r.registrations) || [];
      if (!list.length) {
        return '<div class="msv-sh__value msv-sh__value--empty">регистраций пока нет</div>';
      }

      var now = todayUTC();
      var soon = 30 * DAY_MS;

      return '<table class="msv-sh__pay msv-sh__reg">' +
        '<thead><tr><th>Выдана</th><th>Действует до</th><th>Состояние</th></tr></thead><tbody>' +
        list.map(function (x) {
          var state, cls;
          if (x.until === null) { state = 'срок не указан'; cls = ''; }
          else if (x.until < now) { state = 'истекла'; cls = ' msv-sh__reg--out'; }
          else if (x.until - now <= soon) {
            state = 'осталось ' + Math.max(1, Math.round((x.until - now) / DAY_MS)) + ' дн.';
            cls = ' msv-sh__reg--soon';
          } else { state = 'действует'; cls = ' msv-sh__reg--ok'; }

          return '<tr class="' + cls.trim() + '">' +
            '<td>' + esc(x.issued !== null ? fmtDateFull(x.issued) : '—') +
              (x.address ? '<span class="msv-sh__reg-place">' + esc(x.address) + '</span>' : '') +
              (x.number ? '<span class="msv-sh__reg-place">№ ' + esc(x.number) + '</span>' : '') +
            '</td>' +
            '<td>' + esc(x.until !== null ? fmtDateFull(x.until) : '—') + '</td>' +
            '<td>' + esc(state) + '</td></tr>';
        }).join('') + '</tbody></table>';
    }

    /* Дата подписи равна дате первой оплаты — так заведено у заказчика. */
    function docsHTML(r, list) {
      var DOCS = ['Договор-оферта', 'Правила проживания'];
      var signed = r && r.signedAt ? parseDay(r.signedAt) : null;

      if (signed === null && list && list.length) {
        var first = null;
        list.forEach(function (p) {
          if (p.date === null) return;
          if (first === null || p.date < first) first = p.date;
        });
        signed = first;
      }

      if (!r || r.docsSigned === false) {
        return '<span class="msv-sh__value--empty">не подписаны</span>';
      }
      if (signed === null) return '';

      var SIGNED = { 'Договор-оферта': 'подписан', 'Правила проживания': 'подписаны' };
      return '<ul class="msv-sh__docs">' + DOCS.map(function (name) {
        return '<li><span>' + esc(name) + ' ' + esc(SIGNED[name] || 'подписан') + '</span><span class="msv-sh__docs-date">' +
               esc(fmtDateFull(signed)) + '</span></li>';
      }).join('') + '</ul>';
    }

    var html =
      // без шапки и полос: только крестик в углу, всё содержимое поднято вверх
      '<button type="button" class="msv-sh__panel-close msv-sh__panel-close--float" data-act="close" aria-label="Закрыть карточку">×</button>' +
      '<div class="msv-sh__panel-body msv-sh__panel-body--flush">' +

        // Щелчок по имени открывает полную карточку резидента: анкета,
        // документы, деньги, репутация, заявки, входы (23.09.2026).
        // Аватар остаётся своей кнопкой — он показывает фото крупно.
        '<div class="msv-sh__sect"><div class="msv-sh__ident">' + avatar +
          '<a class="msv-sh__ident-link" href="resident-card.html?id=' + esc(res ? res.id : '') + '" title="Открыть карточку резидента">' +
            '<div class="msv-sh__ident-name">' + esc(res ? res.name : 'Без имени') + '</div>' +
            '<div class="msv-sh__ident-sub"><span class="msv-sh__badge msv-sh__badge--' + st + '">' +
              esc(STATUS_LABEL[st]) + '</span></div>' +
            // где живёт — под именем и статусом «проживает»
            '<div class="msv-sh__ident-place">' + esc(upFirst(placeText)) + '</div>' +
          '</a>' +
        '</div></div>' +

        '<div class="msv-sh__sect">' +
          '<div class="msv-sh__field"><div class="msv-sh__value">' + phoneHTML(res) + '</div></div>' +
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
          field('День рождения', bdayHTML(res)) +
          field('Документы', docsHTML(res, pays)) +
          field('Город', esc(res ? res.city : '')) +
          field('ВУЗ', esc(vuz)) +
          field('Контактное лицо', esc(res ? res.contactPerson : '')) +
          field('Профиль в VK', res && res.vk
            ? '<a href="' + esc(safeUrl(res.vk)) + '" target="_blank" rel="noopener noreferrer">' + esc(res.vk) + '</a>' : '') +
        '</div>' +

        '<div class="msv-sh__sect">' +
          '<div class="msv-sh__sect-head"><span class="msv-sh__sect-title">Миграционный учёт</span></div>' +
          migrationHTML(res) +
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
        (b.holdUntil
          ? '<button type="button" class="msv-sh__btn msv-sh__btn--primary" data-act="unhold">Снять бронь</button>'
          : '<button type="button" class="msv-sh__btn msv-sh__btn--primary" data-act="edit">Изменить бронь</button>' +
            '<button type="button" class="msv-sh__btn" data-act="profile">Профиль</button>') +
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

  /* Ссылки на мессенджеры строятся из телефона.
     ВНИМАНИЕ: адрес Max проверьте у себя — формат ссылок этого
     мессенджера может отличаться. Правится в одном месте, здесь. */
  var MESSENGERS = {
    tg:  { label: 'Тг',   title: 'Написать в Telegram', url: function (p) { return 'https://t.me/+' + p; } },
    max: { label: 'Макс', title: 'Написать в Max',      url: function (p) { return 'https://max.ru/+' + p; } }
  };

  function phoneDigits(phone) {
    var d = String(phone || '').replace(/\D/g, '');
    if (d.length === 11 && (d.charAt(0) === '8')) d = '7' + d.slice(1);
    return d;
  }

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
    hidePhoto();
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
    this._dragCleanup();
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
