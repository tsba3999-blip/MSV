/* © 2026 МСВ. Все права защищены. Программа для ЭВМ охраняется ст. 1259, 1261 ГК РФ. Подробнее: /legal.html */
/* ============================================================
   Начисления и оплаты: общий сценарий для кабинета администратора
   и кабинета модератора. Страницы отличаются только боковым меню.
   ============================================================ */
MSV.ready(function (ctx) {
  'use strict';

  /* Пока перенос данных не закончен, система не считает пени и не
     выставляет места на продажу. Говорим об этом прямо там, где человек
     вносит оплаты, — иначе легко забыть дать команду (24.09.2026). */
  (function () {
    if (!ctx.live || !ctx.me || ctx.me.moneyRules) return;
    var box = document.querySelector('.work__body');
    if (!box) return;
    var p = document.createElement('p');
    p.className = 'msv-note notice';
    p.textContent = 'Идёт перенос данных: пени и автоматическая продажа неоплаченных мест пока выключены. ' +
      'Когда все оплаты и депозиты будут в системе, администратор включает их в настройках — одной галочкой ' +
      '«Перешли на новую шахматку».';
    box.insertBefore(p, box.firstChild);
  })();

  var RES = ctx.residences;
  var PENALTY = 3000;               // пени за первый день просрочки — из хендоффа
  var DUE_DAY = 15;                 // оплата до 15 числа

  var now = new Date();
  var todayDay = now.getDate();
  var MONTHS = ['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'];
  var period = MONTHS[(now.getMonth() + 1) % 12] + ' ' + (now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear());

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function money(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u2009') + '\u2009руб.';
  }

  function initials(name) {
    var p = String(name).trim().split(/\s+/);
    return p.length > 1 ? (p[0][0] + p[1][0]).toUpperCase() : p[0][0].toUpperCase();
  }

  /* Одна строка — одно начисление за следующий месяц по каждой живой брони.
     Пени считаются автоматически, если после 15 числа остаток больше нуля. */
  var ALL = [];
  RES.forEach(function (res) {
    var d = ctx.bookings(res);
    var byId = {}; d.residents.forEach(function (r) { byId[r.id] = r; });
    var bedById = {}; res.beds.forEach(function (b) { bedById[b.id] = b; });
    var roomById = {}; res.rooms.forEach(function (r) { roomById[r.id] = r; });

    d.bookings.forEach(function (b) {
      var p = byId[b.residentId]; if (!p) return;
      var bed = bedById[b.bedId];
      var room = bed ? roomById[bed.roomId] : null;
      var accrued = b.accrued || 0;
      var paid = b.paid || 0;
      var rest = Math.max(0, accrued - paid);
      /* Пени считает сервер по Правилам — 3 000 за первые сутки просрочки
         и 500 за каждые следующие. Своей выдумки здесь больше нет: она
         показывала ровно 3 000 и вдобавок поверх уже начисленных
         (24.09.2026). Они уже входят в «начислено», поэтому из него их
         вычитаем, чтобы не сложить дважды. */
      var penalty = Number(b.penalty) || 0;
      accrued -= penalty;
      rest = Math.max(0, accrued + penalty - paid);

      ALL.push({
        id: b.id, res: res, name: p.name,
        bed: bed ? bed.label : '', room: room ? (room.name || ('к. ' + room.number)) : '',
        accrued: accrued, paid: paid, penalty: penalty,
        deposit: !!b.depositCharged
      });
    });
  });
  ALL.sort(function (a, b) {
    var da = (a.accrued + a.penalty - a.paid), db = (b.accrued + b.penalty - b.paid);
    if ((da > 0.5) !== (db > 0.5)) return da > 0.5 ? -1 : 1;
    return a.name.localeCompare(b.name, 'ru');
  });

  var state = { q: '', res: '', only: {} };

  function rest(x) { return Math.max(0, x.accrued + x.penalty - x.paid); }

  function matches(x) {
    if (state.res && x.res.id !== state.res) return false;
    if (state.only.debt && !(rest(x) > 0.5)) return false;
    if (state.only.penalty && !(x.penalty > 0)) return false;
    if (state.q) {
      var hay = (x.name + ' ' + x.bed + ' ' + x.room).toLowerCase().replace(/ё/g, 'е');
      if (hay.indexOf(state.q) === -1) return false;
    }
    return true;
  }

  function render() {
    var list = ALL.filter(matches);
    var tAcc = 0, tPaid = 0, tRest = 0, tPen = 0, debtors = 0;
    ALL.forEach(function (x) {
      tAcc += x.accrued; tPaid += x.paid; tPen += x.penalty;
      var r = rest(x); tRest += r; if (r > 0.5) debtors++;
    });

    document.getElementById('stats').innerHTML = [
      ['Начислено за ' + period, money(tAcc), ALL.length + ' начислений', ''],
      ['Получено', money(tPaid), Math.round(100 * tPaid / (tAcc || 1)) + '% от начисленного', ''],
      ['Остаток к получению', money(tRest), debtors + ' чел. не закрыли месяц', tRest > 0 ? ' stat--debt' : ''],
      ['Пени', money(tPen), tPen ? (tPen / PENALTY) + ' начислений по 3000' : 'просрочек нет', '']
    ].map(function (x) {
      return '<div class="stat' + x[3] + '"><span class="stat__label">' + esc(x[0]) + '</span>' +
        '<span class="stat__value">' + esc(x[1]) + '</span>' +
        '<span class="msv-note stat__note">' + esc(x[2]) + '</span></div>';
    }).join('');

    document.getElementById('count').textContent = list.length + ' из ' + ALL.length;

    document.getElementById('rows').innerHTML = list.length ? list.map(function (x) {
      var r = rest(x);
      var st, cls;
      if (r < 0.5) { st = 'оплачено'; cls = 'tag--ok'; }
      else if (x.penalty > 0) { st = 'просрочено, пени ' + money(x.penalty); cls = 'tag--bad'; }
      else if (x.paid > 0.5) { st = 'частично'; cls = 'tag--warn'; }
      else { st = 'не оплачено'; cls = 'tag--info'; }

      return '<tr data-id="' + esc(x.id) + '">' +
        '<td><span class="who-cell"><span class="who-cell__face">' + esc(initials(x.name)) + '</span>' +
          '<span><span class="who-cell__name">' + esc(x.name) + '</span>' +
          '<span class="msv-note sub">' + esc(x.bed) + ' · ' + esc(x.room) + ' · ' + esc(x.res.name) + '</span></span></span></td>' +
        '<td>' + esc(period) + '</td>' +
        '<td class="num">' + esc(money(x.accrued + x.penalty)) +
          (x.penalty ? '<span class="msv-note sub">вкл. пени ' + esc(money(x.penalty)) + '</span>' : '') + '</td>' +
        '<td class="num">' + esc(money(x.paid)) + '</td>' +
        '<td class="num">' + (r > 0.5 ? '<b>' + esc(money(r)) + '</b>' : '—') + '</td>' +
        '<td><span class="tag ' + cls + '">' + esc(st) + '</span></td>' +
        '<td>' + (x.deposit
          ? '<span class="tag tag--ok">внесён</span>'
          : '<button class="msv-btn msv-btn--s msv-btn--tertiary" type="button" data-act="dep" title="Депозит равен месячной плате и засчитывается оплатой августа">Внести депозит</button>') + '</td>' +
        '<td class="num">' + (r > 0.5
          ? '<button class="msv-btn msv-btn--s msv-btn--tertiary" type="button" data-act="paid">Отметить оплату</button>'
          : '') + '</td>' +
      '</tr>';
    }).join('') : '<tr><td colspan="8" class="grid__empty">Ничего не нашлось.</td></tr>';
  }

  /* Депозит: кнопка на время переноса данных. Заводит начисление за август
     и сразу отмечает его оплаченным — у тех, кто заселился до появления
     системы, депозит внесён давно (решение заказчика 24.09.2026). */
  document.getElementById('rows').addEventListener('click', function (e) {
    var btn = e.target.closest('[data-act="dep"]');
    if (!btn) return;
    var x = ALL.filter(function (y) { return y.id === btn.closest('tr').dataset.id; })[0];
    if (!x) return;
    if (!confirm('Внести депозит за ' + x.name + '?\nДепозит равен месячной плате и засчитывается оплатой августа.')) return;
    function apply(sum) { x.deposit = true; x.accrued += sum; x.paid += sum; render(); }
    if (!ctx.live) { apply(0); return; }
    btn.disabled = true;
    ctx.api('POST', '/api/bookings/' + encodeURIComponent(x.id) + '/deposit', {})
      .then(function (r) {
        if (r.status === 201) { apply(Number(r.body && r.body.amount) || 0); return; }
        btn.disabled = false;
        alert(r.body && r.body.error || 'Не удалось');
      })
      .catch(function () { btn.disabled = false; alert('Сервер не отвечает'); });
  });

  document.getElementById('rows').addEventListener('click', function (e) {
    var btn = e.target.closest('[data-act="paid"]');
    if (!btn) return;
    var x = ALL.filter(function (y) { return y.id === btn.closest('tr').dataset.id; })[0];
    if (!x) return;
    var amount = Math.max(0, x.accrued + x.penalty - x.paid);
    function apply() { x.paid = x.accrued + x.penalty; render(); }
    if (!ctx.live) { apply(); return; }
    ctx.api('POST', '/api/payments', { bookingId: x.id, amount: amount, method: 'cash' })
      .then(function (r) { if (r.status === 201) apply(); else alert(r.body && r.body.error || 'Не удалось'); })
      .catch(function () { alert('Сервер не отвечает'); });
  });

  var timer = null;
  document.getElementById('q').addEventListener('input', function (e) {
    clearTimeout(timer);
    var v = e.target.value;
    timer = setTimeout(function () { state.q = v.trim().toLowerCase().replace(/ё/g, 'е'); render(); }, 150);
  });

  document.querySelector('.bar').addEventListener('click', function (e) {
    var chip = e.target.closest('.bar__chip');
    if (!chip) return;
    if (chip.hasAttribute('data-res')) {
      document.querySelectorAll('[data-res]').forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
      chip.setAttribute('aria-pressed', 'true');
      state.res = chip.getAttribute('data-res');
    } else {
      var key = chip.getAttribute('data-only');
      var on = chip.getAttribute('aria-pressed') === 'true';
      chip.setAttribute('aria-pressed', on ? 'false' : 'true');
      state.only[key] = !on;
    }
    render();
  });

  render();
});
