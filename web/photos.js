/* ============================================================
   Фотографии резиденций (файлы заказчика, 23–24.09.2026).
   Здесь только список и подписи — страницы берут их отсюда.
   Как добавить фото: положить файл в photos/<резиденция>/ и
   дописать строку ниже. Порядок в списке = порядок показа.
   kind: 'house' — здание и вход, 'room' — комнаты, 'common' —
   кухня, лаунж, коворкинг, 'detail' — мелочи и уют.
   ============================================================ */
(function (global) {
  'use strict';

  var PHOTOS = {
    forma: [
      { src: 'photos/forma/01.jpg', kind: 'house',  alt: 'Форма: здание резиденции на Конном переулке' },
      { src: 'photos/forma/03.jpg', kind: 'room',   alt: 'Форма: двухместная комната с окном' },
      { src: 'photos/forma/05.jpg', kind: 'room',   alt: 'Форма: комната с двухъярусными кроватями' },
      { src: 'photos/forma/06.jpg', kind: 'room',   alt: 'Форма: гардеробная зона в комнате' },
      { src: 'photos/forma/07.jpg', kind: 'room',   alt: 'Форма: комната со столом и кроватью-чердаком' },
      { src: 'photos/forma/08.jpg', kind: 'room',   alt: 'Форма: комната с рабочим столом' },
      { src: 'photos/forma/09.jpg', kind: 'room',   alt: 'Форма: светлая комната на четверых' },
      { src: 'photos/forma/13.jpg', kind: 'detail', alt: 'Форма: надпись «Просто это красиво» в комнате' },
      { src: 'photos/forma/14.jpg', kind: 'room',   alt: 'Форма: комната с большим шкафом' },
      { src: 'photos/forma/15.jpg', kind: 'room',   alt: 'Форма: комната с письменным столом' },
      { src: 'photos/forma/16.jpg', kind: 'common', alt: 'Форма: коворкинг с рабочими местами' },
      { src: 'photos/forma/17.jpg', kind: 'common', alt: 'Форма: коридор со шкафами и ячейками' },
      { src: 'photos/forma/18.jpg', kind: 'common', alt: 'Форма: кухня-столовая' },
      { src: 'photos/forma/19.jpg', kind: 'common', alt: 'Форма: большая кухня' },
      { src: 'photos/forma/20.jpg', kind: 'common', alt: 'Форма: лаундж с кирпичными стенами' },
      { src: 'photos/forma/12.jpg', kind: 'detail', alt: 'Форма: полка с настольными играми' },
      { src: 'photos/forma/10.jpg', kind: 'detail', alt: 'Форма: постельное бельё' },
      { src: 'photos/forma/11.jpg', kind: 'detail', alt: 'Форма: постельное бельё с акулами' },
      { src: 'photos/forma/02.jpg', kind: 'detail', alt: 'Форма: матрас Askona Hotel Sleep Master' },
      { src: 'photos/forma/04.jpg', kind: 'room',   alt: 'Форма: комната с двумя кроватями' }
    ],
    uyut: [
      { src: 'photos/uyut/01.jpg', kind: 'house',  alt: 'Уют: вход с вывеской, вечер' },
      { src: 'photos/uyut/02.jpg', kind: 'room',   alt: 'Уют: комната с красными стенами' },
      { src: 'photos/uyut/03.jpg', kind: 'room',   alt: 'Уют: четырёхместная комната' },
      { src: 'photos/uyut/04.jpg', kind: 'room',   alt: 'Уют: комната со столом и зеркалом' },
      { src: 'photos/uyut/05.jpg', kind: 'room',   alt: 'Уют: комната с сиреневыми стенами' },
      { src: 'photos/uyut/06.jpg', kind: 'room',   alt: 'Уют: комната с синими стенами и рабочим столом' },
      { src: 'photos/uyut/07.jpg', kind: 'room',   alt: 'Уют: комната с бежевыми стенами' },
      { src: 'photos/uyut/08.jpg', kind: 'room',   alt: 'Уют: капсулы со шторкой и своим светом' },
      { src: 'photos/uyut/09.jpg', kind: 'common', alt: 'Уют: кухня с тремя холодильниками' },
      { src: 'photos/uyut/10.jpg', kind: 'common', alt: 'Уют: гостиная с проектором и большим экраном' },
      { src: 'photos/uyut/11.jpg', kind: 'common', alt: 'Уют: камера хранения и зона отдыха' },
      { src: 'photos/uyut/12.jpg', kind: 'common', alt: 'Уют: душевые и прачечная' },
      { src: 'photos/uyut/13.jpg', kind: 'common', alt: 'Уют: туалет' },
      { src: 'photos/uyut/14.jpg', kind: 'common', alt: 'Уют: туалет с раковиной' },
      { src: 'photos/uyut/15.jpg', kind: 'detail', alt: 'Уют: бесплатные каши по утрам' },
      { src: 'photos/uyut/16.jpg', kind: 'detail', alt: 'Уют: матрас Askona Hotel Sleep Master' },
      { src: 'photos/uyut/17.jpg', kind: 'detail', alt: 'Уют: три резиденции МСВ на карте Москвы' }
    ],
    molod: [
      { src: 'photos/molod/01.jpg', kind: 'room',   alt: 'Молодежка: комната с кроватью, столом и шкафом' },
      { src: 'photos/molod/02.jpg', kind: 'room',   alt: 'Молодежка: комната на двоих с пианино' },
      { src: 'photos/molod/03.jpg', kind: 'room',   alt: 'Молодежка: комната на двоих, вид от двери' },
      { src: 'photos/molod/04.jpg', kind: 'common', alt: 'Молодежка: кухня с эркером' },
      { src: 'photos/molod/05.jpg', kind: 'detail', alt: 'Молодежка: шкаф у кровати' },
      { src: 'photos/molod/06.jpg', kind: 'detail', alt: 'Молодежка: шкаф внутри — штанга и полки' },
      { src: 'photos/molod/07.jpg', kind: 'detail', alt: 'Молодежка: планировка квартиры, 74 м²' }
    ]
  };

  function all(id) { return PHOTOS[id] || []; }
  function first(id, n) { return all(id).slice(0, n || 1); }
  function byKind(id, kind) { return all(id).filter(function (p) { return p.kind === kind; }); }
  /* Снимки для карточки комнаты: берём фотографии комнат по кругу,
     чтобы у каждой карточки были свои, пока нет привязки фото к комнате. */
  function forRoom(id, index, count) {
    var rooms = byKind(id, 'room');
    if (!rooms.length) return [];
    var out = [];
    for (var i = 0; i < (count || 3); i++) out.push(rooms[(index * 2 + i) % rooms.length]);
    return out;
  }

  global.MSV_PHOTOS = { all: all, first: first, byKind: byKind, forRoom: forRoom, data: PHOTOS };
})(window);
