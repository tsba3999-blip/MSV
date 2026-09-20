/* © 2026 МСВ. Все права защищены. Программа для ЭВМ охраняется ст. 1259, 1261 ГК РФ. Использование без разрешения правообладателя запрещено. Подробнее: /legal.html */
/* ============================================================
   МСВ — вымышленные проживающие и брони для шахматки

   Комнаты и цены настоящие (residences.js), а люди и брони —
   выдуманные: без сервера взять настоящие неоткуда. Раскладываются
   по местам той резиденции, которую сейчас смотрят.

   Когда появится сервер, этот файл удаляется, а в admin-shahmatka.html
   вместо MSV_DEMO_BOOKINGS подставляется ответ /api/bookings.
   ============================================================ */

(function (global) {
  'use strict';

  var NAMES = [
    'Логинов Артём Сергеевич', 'Высоцкая Полина Денисовна', 'Крякова Анна Сергеевна',
    'Чекючоглу Суде', 'Курт-оглы Яна', 'Черкасов Матвей Игоревич',
    'Боловленкова Нелли Викторовна', 'Рябчикова Арина Павловна', 'Аталиков Азрет Русланович',
    'Гисматуллин Эрик Маратович', 'Игнатьева Милана Олеговна', 'Жуков Егор Денисович',
    'Семёнов Егор Андреевич', 'Максюков Тимур Ринатович', 'Скрипов Владислав Юрьевич',
    'Столяров Антон Михайлович', 'Федотов Арсений Глебович', 'Бурцасов Егор Петрович',
    'Торосян Роберт Ашотович', 'Терников Матвей Ильич', 'Посунько Давид Артёмович',
    'Збарский Макар Львович', 'Павлов Илья Романович', 'Курова Дарья Ивановна'
  ];

  var SCHOOLS = [
    ['МИСИС', 'Материаловедение'],
    ['ВШЭ', 'Реклама и связи с общественностью'],
    ['РУДН', 'Юриспруденция'],
    ['МГМУ им. Сеченова', 'Лечебное дело'],
    ['МГТУ им. Н.Э. Баумана', 'Информатика'],
    ['РЭУ им. Г.В. Плеханова', 'Экономика'],
    ['Колледж РАНХиГС', 'Бухгалтерский учёт'],
    ['ВГИК', 'Режиссура']
  ];

  var CITIES = ['Тула', 'Краснодар', 'Казань', 'Воронеж', 'Стамбул', 'Пермь', 'Омск', 'Сочи'];
  var SOURCES = ['Сайт', 'От стойки', 'Перевод из другой резиденции'];

  /* Свой генератор случайных чисел с зерном: при каждом открытии
     страницы расстановка одна и та же, иначе демонстрация «прыгала» бы. */
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

  function iso(base, offsetDays) {
    var d = new Date(base + offsetDays * 86400000);
    return d.getUTCFullYear() + '-' +
      String(d.getUTCMonth() + 1).padStart(2, '0') + '-' +
      String(d.getUTCDate()).padStart(2, '0');
  }

  function build(res) {
    var rand = rng(seedOf(res.id));
    var now = new Date();
    var base = Date.UTC(now.getFullYear(), now.getMonth(), 1);

    var priceOf = {};
    res.beds.forEach(function (b) { priceOf[b.id] = b.price || 25000; });

    var residents = [];
    var bookings = [];
    var payments = [];
    var n = 0;

    res.beds.forEach(function (bed, i) {
      /* Примерно половина мест свободна: иначе переселять бронь было бы
         некуда — почти любое место оказывалось бы занятым. */
      if (rand() > 0.55) return;

      var name = NAMES[n % NAMES.length];
      var school = SCHOOLS[n % SCHOOLS.length];
      var uid = res.id + '-u' + n;
      var price = priceOf[bed.id];

      residents.push({
        id: uid,
        name: name,
        phone: '+7 9' + String(10 + (n * 7) % 89) + ' ' +
               String(100 + (n * 31) % 899) + '-' +
               String(10 + (n * 13) % 89) + '-' +
               String(10 + (n * 17) % 89),
        // 2004-2010: часть резидентов младше 18 — видно метку в карточке
        birthday: (2004 + (n % 7)) + '-' +
                  String(1 + (n * 5) % 12).padStart(2, '0') + '-' +
                  String(1 + (n * 3) % 28).padStart(2, '0'),
        docsSigned: rand() > 0.25,
        city: CITIES[n % CITIES.length] + ', Россия',
        university: school[0],
        program: school[1],
        contactPerson: rand() > 0.5 ? 'Родитель, +7 900 000-00-0' + (n % 10) : '',
        vk: rand() > 0.6 ? 'vk.com/msv_resident_' + n : '',
        messengers: rand() > 0.6 ? ['tg', 'max'] : (rand() > 0.3 ? ['tg'] : ['max']),
        /* Миграционный учёт: одна-три регистрации, у части срок уже вышел
           или заканчивается — чтобы в карточке были видны все состояния. */
        registrations: (function () {
          var out = [];
          var count = 1 + Math.floor(rand() * 3);
          for (var q = 0; q < count; q++) {
            var start = -300 + q * 110 + Math.floor(rand() * 30);
            out.push({
              number: '77' + String(100000 + Math.floor(rand() * 899999)),
              issued: iso(base, start),
              until: iso(base, start + 90 + Math.floor(rand() * 60)),
              address: res.title
            });
          }
          return out;
        })()
      });

      // Заезд: кто-то давно, кто-то на днях, кто-то ещё едет
      var from = Math.floor(rand() * 120) - 70;
      /* Сроки разной длины: при одинаково длинных бронях свободных
         окон в сетке не остаётся. */
      var nights = rand() > 0.5 ? (30 + Math.floor(rand() * 70))
                                : (120 + Math.floor(rand() * 200));
      var accrued = price;
      var paid = rand() > 0.22 ? price : Math.floor(price * (0.3 + rand() * 0.4));

      bookings.push({
        id: res.id + '-bk' + n,
        bedId: bed.id,
        residentId: uid,
        from: iso(base, from),
        to: iso(base, from + nights),
        source: SOURCES[n % SOURCES.length],
        tariff: 'Годовой контракт',
        accrued: accrued,
        paid: paid,
        bookedAt: iso(base, from - 20 - Math.floor(rand() * 40)),
        note: paid < accrued ? 'долг по оплате за месяц' : ''
      });

      var months = ['Июнь 2026', 'Июль 2026', 'Август 2026'];
      for (var k = 0; k < 2 + Math.floor(rand() * 2); k++) {
        payments.push({
          id: res.id + '-p' + n + '-' + k,
          residentId: uid,
          period: months[k % months.length],
          amount: price,
          date: iso(base, -20 - k * 30)
        });
      }

      n++;
    });

    return { residents: residents, bookings: bookings, payments: payments };
  }

  global.MSV_DEMO_BOOKINGS = build;

})(window);
