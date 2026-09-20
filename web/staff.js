/* © 2026 МСВ. Все права защищены. Подробнее: /legal.html */
/* ============================================================
   МСВ — сотрудники (реальные, от заказчика 16.09.2026)

   Место работы: forma — Шаболовская («Шаб.»), uyut — Варшавское («Варш.»),
   all — все резиденции. Пустое поле — заказчик не сообщил, уточнить.
   Данные для сервера — server/db/seed-staff.sql.
   ============================================================ */

window.MSV_STAFF = [
  { id: 'st1', name: 'Чупахина Юлия',   role: 'moderator', position: 'Модератор',
    birthday: '1972-12-13', started: '2025-01-15', place: 'all',   salary: null,  payTo: '', relation: 'уточнить' },
  { id: 'st2', name: 'Зорина Марина',   role: 'staff',     position: 'Горничная-администратор',
    birthday: '1977-07-04', started: '2023-09-01', place: '',      salary: 60000, payTo: '', relation: 'уточнить' },
  { id: 'st3', name: 'Мирзоева Фарогат', role: 'staff',    position: 'Горничная-администратор',
    birthday: '1990-01-15', started: '2026-08-25', place: '',      salary: 80000, payTo: '', relation: 'уточнить' },
  { id: 'st4', name: 'Лэкэтуш Наталья', role: 'staff',     position: 'Горничная-администратор',
    birthday: '1983-05-14', started: '2025-10-01', place: '',      salary: 60000, payTo: '', relation: 'уточнить' },
  { id: 'st5', name: 'Харина Елена',    role: 'staff',     position: 'Ассистент',
    birthday: '',           started: '',           place: '',      salary: null,  payTo: '', relation: 'уточнить' }
];

window.MSV_STAFF_PLACE = { forma: 'Шаб.', uyut: 'Варш.', molod: 'Мол.', all: 'Все', '': '—' };

/* Стаж словами: «1 год 8 мес.» — от даты выхода до сегодня */
window.MSV_STAFF_TENURE = function (iso) {
  if (!iso) return '—';
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso); if (!m) return '—';
  var a = new Date(+m[1], +m[2] - 1, +m[3]), b = new Date();
  var months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) - (b.getDate() < a.getDate() ? 1 : 0);
  if (months < 0) return 'ещё не вышел';
  var y = Math.floor(months / 12), mo = months % 12;
  var py = function (n) { var t = n % 10, h = n % 100; return (h > 10 && h < 20) ? 'лет' : t === 1 ? 'год' : (t > 1 && t < 5) ? 'года' : 'лет'; };
  var parts = [];
  if (y) parts.push(y + ' ' + py(y));
  if (mo || !y) parts.push(mo + ' мес.');
  return parts.join(' ');
};
