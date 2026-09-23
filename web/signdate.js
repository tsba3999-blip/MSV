/* © 2026 МСВ. Все права защищены. Подробнее: /legal.html */
/* ============================================================
   Даты подписей документов

   Резидент подписывает договор, правила и согласие заново при каждой
   оплате, поэтому сервер отдаёт список подписей (/api/me/docs).
   Здесь — только чтение списка и человеческая запись даты; кто и где
   её показывает, решает страница.
   ============================================================ */
(function (global) {
  'use strict';

  var MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
                'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

  /* 23 сентября 2026 г., 19:40 — время добавляем, только если оно известно */
  function human(at, exact) {
    var d = new Date(at); if (isNaN(d)) return '';
    var s = d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear() + ' г.';
    if (exact) s += ', ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    return s;
  }

  /* Фамилия Имя — так подпись читается привычнее, чем «Имя Фамилия» */
  function who(name) {
    var p = String(name || '').split(/\s+/).filter(Boolean);
    return p.length >= 2 ? p[1] + ' ' + p[0] : (name || '');
  }

  function load(done) {
    if (location.protocol === 'file:') return;
    fetch('/api/me/docs', { credentials: 'same-origin' })
      .then(function (r) { return r.status === 200 ? r.json() : null; })
      .then(function (d) { if (d) done(d); })
      .catch(function () {});
  }

  global.MSV_SIGN = { human: human, who: who, load: load };
})(window);
