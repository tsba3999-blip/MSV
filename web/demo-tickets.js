/* © 2026 МСВ. Все права защищены. Программа для ЭВМ охраняется ст. 1259, 1261 ГК РФ. Использование без разрешения правообладателя запрещено. Подробнее: /legal.html */
/* ============================================================
   МСВ — вымышленные заявки в сервис

   Строятся из тех же резидентов, что и брони, поэтому фамилии
   и комнаты в заявках совпадают с шахматкой.

   Когда появится сервер, файл удаляется, а вместо MSV_DEMO_TICKETS
   подставляется ответ /api/tickets.
   ============================================================ */

(function (global) {
  'use strict';

  var CATEGORIES = ['Сантехника', 'Электрика', 'Бытовая техника',
                    'Мебель', 'Вентиляция', 'Улучшения'];

  /* Приоритеты и сроки — те же, что в форме заявки у резидента */
  var PRIORITIES = [
    { key: 'critical', name: 'Критическая авария', hours: 2 },
    { key: 'urgent',   name: 'Срочная поломка',    hours: 12 },
    { key: 'normal',   name: 'Текущая неисправность', hours: 72 },
    { key: 'consult',  name: 'Консультация',       hours: 120 }
  ];

  var STATUSES = ['Принята', 'В работе', 'Выполнена', 'Отклонена'];

  var TROUBLES = [
    'Не закрывается окно, ручка проворачивается',
    'Течёт смеситель в душевой',
    'Не работает розетка у кровати',
    'Сломалась дверца шкафа',
    'Шумит вытяжка в санузле',
    'Перегорела лампа в коридоре',
    'Не греет батарея',
    'Заедает замок в комнате',
    'Не сливает бачок',
    'Отклеился плинтус',
    'Мигает свет на кухне',
    'Не открывается форточка'
  ];

  var MASTERS = ['Сергей Ким', 'Алина Рахимова', 'Павел Дроздов'];

  function rng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function seedOf(text) {
    var h = 2166136261;
    for (var i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h;
  }

  function build(res, residents, bookings) {
    var rand = rng(seedOf(res.id + 'tickets'));
    var now = Date.now();

    var bedById = {};
    res.beds.forEach(function (b) { bedById[b.id] = b; });
    var roomById = {};
    res.rooms.forEach(function (r) { roomById[r.id] = r; });
    var resById = {};
    residents.forEach(function (r) { resById[r.id] = r; });

    var out = [];

    bookings.forEach(function (b, i) {
      if (rand() > 0.34) return;              // заявка есть примерно у трети

      var person = resById[b.residentId];
      var bed = bedById[b.bedId];
      var room = bed ? roomById[bed.roomId] : null;
      var prio = PRIORITIES[Math.floor(rand() * PRIORITIES.length)];

      /* Часть заявок намеренно просрочена: администратору важно
         видеть именно их, а не только свежие. */
      var ageHours = Math.floor(rand() * 200);
      var created = now - ageHours * 3600000;
      var status = STATUSES[Math.floor(rand() * STATUSES.length)];
      var closed = status === 'Выполнена' || status === 'Отклонена';
      var overdue = !closed && ageHours > prio.hours;

      out.push({
        id: res.id + '-t' + i,
        residence: res.title,
        residenceId: res.id,
        resident: person ? person.name : 'Не указан',
        residentId: b.residentId,
        room: room ? (room.name || ('к. ' + room.number)) : '',
        bed: bed ? bed.label : '',
        category: CATEGORIES[Math.floor(rand() * CATEGORIES.length)],
        priority: prio.key,
        priorityName: prio.name,
        deadlineHours: prio.hours,
        text: TROUBLES[Math.floor(rand() * TROUBLES.length)],
        status: status,
        overdue: overdue,
        ageHours: ageHours,
        created: created,
        master: closed || rand() > 0.4 ? MASTERS[Math.floor(rand() * MASTERS.length)] : ''
      });
    });

    // свежие сверху, просроченные — в самый верх
    out.sort(function (a, b) {
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
      return b.created - a.created;
    });

    return out;
  }

  global.MSV_DEMO_TICKETS = build;

})(window);
