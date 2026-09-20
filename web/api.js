/* © 2026 МСВ. Все права защищены. Подробнее: /legal.html */
/* ============================================================
   МСВ — слой данных

   Одна точка, откуда страницы берут данные. Если сервер отвечает
   и вход выполнен — данные настоящие, из базы. Если сервера нет
   (страница открыта с диска) или вход не выполнен — прежние
   демонстрационные, чтобы всё можно было смотреть без сервера.

   Страница пишет:
     MSV.ready(function (ctx) { ... });
   и получает ctx:
     ctx.live        — true, если данные с сервера
     ctx.me          — { id, role, name } или null
     ctx.residences  — как MSV_RESIDENCES
     ctx.bookings(res)  — { residents, bookings, payments } для резиденции
     ctx.tickets()      — все заявки (с учётом роли)
     ctx.api(method, url, body) — запрос к серверу

   Пока данные грузятся, страница ждёт. Обычно это десятки миллисекунд.
   ============================================================ */

(function (global) {
  'use strict';

  var cache = { me: undefined, residences: null, perRes: {}, tickets: null };

  function api(method, url, body) {
    return fetch(url, {
      method: method, credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      return r.text().then(function (t) {
        var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) { j = null; }
        return { status: r.status, body: j };
      });
    });
  }

  /* Сервер есть и вход выполнен? Один запрос, результат запоминаем. */
  function whoami() {
    if (cache.me !== undefined) return Promise.resolve(cache.me);
    if (location.protocol === 'file:') { cache.me = null; return Promise.resolve(null); }
    return api('GET', '/api/auth/me').then(function (r) {
      cache.me = r.status === 200 ? r.body : null;
      return cache.me;
    }).catch(function () { cache.me = null; return null; });
  }

  /* ---------- Настоящие данные ---------- */

  function liveResidences() {
    if (cache.residences) return Promise.resolve(cache.residences);
    return api('GET', '/api/residences').then(function (r) {
      if (r.status !== 200 || !Array.isArray(r.body)) throw new Error('residences');
      cache.residences = r.body;
      return cache.residences;
    });
  }

  function liveBookings(res) {
    if (cache.perRes[res.id]) return Promise.resolve(cache.perRes[res.id]);
    return api('GET', '/api/shahmatka?res=' + encodeURIComponent(res.id)).then(function (r) {
      if (r.status !== 200) throw new Error('shahmatka');
      cache.perRes[res.id] = r.body;
      return r.body;
    });
  }

  function liveTickets() {
    if (cache.tickets) return Promise.resolve(cache.tickets);
    return api('GET', '/api/tickets').then(function (r) {
      if (r.status !== 200 || !Array.isArray(r.body)) throw new Error('tickets');
      cache.tickets = r.body;
      return cache.tickets;
    });
  }

  /* ---------- Демонстрационные ---------- */

  function demoCtx(me) {
    var RES = global.MSV_RESIDENCES || [];
    var memo = {};
    return {
      live: false, me: me || null, residences: RES,
      bookings: function (res) {
        if (!memo[res.id]) {
          // Реальные люди (residents-uyut.js) имеют приоритет над вымышленными
          var real = global.MSV_REAL && global.MSV_REAL[res.id];
          memo[res.id] = real ? real : (global.MSV_DEMO_BOOKINGS ? global.MSV_DEMO_BOOKINGS(res) : { residents: [], bookings: [], payments: [] });
        }
        return memo[res.id];
      },
      tickets: function () {
        if (!global.MSV_DEMO_TICKETS) return [];
        var all = [];
        RES.forEach(function (r) { var d = this.bookings(r); all = all.concat(global.MSV_DEMO_TICKETS(r, d.residents, d.bookings)); }, this);
        return all;
      },
      api: api
    };
  }

  /* ---------- Точка входа для страниц ---------- */

  var queue = [];
  var ctxPromise = null;

  function build() {
    return whoami().then(function (me) {
      if (!me) return demoCtx(null);

      /* Резиденции нужны всем; брони и заявки — по требованию,
         но синхронно для страниц, поэтому грузим заранее всё,
         что понадобится роли. */
      return liveResidences().then(function (residences) {
        var needBookings = me.role === 'admin' || me.role === 'moderator';
        var jobs = [];
        if (needBookings) residences.forEach(function (r) { jobs.push(liveBookings(r).catch(function () { return null; })); });
        jobs.push(liveTickets().catch(function () { return null; }));

        return Promise.all(jobs).then(function () {
          return {
            live: true, me: me, residences: residences,
            bookings: function (res) { return cache.perRes[res.id] || { residents: [], bookings: [], payments: [] }; },
            tickets: function () { return cache.tickets || []; },
            api: api
          };
        });
      }).catch(function () {
        // сервер есть, но данные не отдал — не оставляем страницу пустой
        return demoCtx(me);
      });
    });
  }

  function ready(fn) {
    if (!ctxPromise) ctxPromise = build();
    ctxPromise.then(function (ctx) {
      try { fn(ctx); } catch (e) { console.error('[MSV.ready]', e); }
    });
  }

  global.MSV = global.MSV || {};
  global.MSV.ready = ready;
  global.MSV.api = api;
  global.MSV.whoami = whoami;

})(window);
