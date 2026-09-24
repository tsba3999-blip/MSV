/* © 2026 МСВ. Все права защищены. Подробнее: /legal.html */
/* ============================================================
   МСВ — сотрудники

   Список живёт в базе, а не здесь. Раньше он был записан прямо в этом
   файле: завели человека в кабинете — на странице он не появлялся,
   уволили — оставался. Два списка вместо одного, и какой верный,
   понять было нельзя (решение заказчика 25.09.2026).

   Место работы: forma — Шаболовская («Шаб.»), uyut — Варшавское («Варш.»),
   all — все резиденции. Пустое — ещё не заполнено.
   ============================================================ */

window.MSV_STAFF = [];

/* Спросить сервер. Отдаёт обещание со списком; без сервера (открыт
   файл с диска) — пустой список, чтобы страница не падала. */
window.MSV_STAFF_LOAD = function () {
  if (location.protocol === 'file:') return Promise.resolve([]);
  return fetch('/api/staff', { credentials: 'same-origin' })
    .then(function (r) { return r.status === 200 ? r.json() : []; })
    .then(function (list) { window.MSV_STAFF = list || []; return window.MSV_STAFF; })
    .catch(function () { return []; });
};

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
