/* © 2026 МСВ. Все права защищены. Программа для ЭВМ охраняется ст. 1259, 1261 ГК РФ. Использование без разрешения правообладателя запрещено. Подробнее: /legal.html */
/* ============================================================
   МСВ — препятствия копированию на стороне браузера

   ЧИТАТЬ ПЕРЕД ВКЛЮЧЕНИЕМ.

   Ни одна из этих мер не защищает от копирования: браузер уже
   скачал страницу, и её можно сохранить через меню, через
   инструменты разработчика, через curl. Всё, что здесь есть, —
   неудобства для случайного человека и ноль препятствий для того,
   кто копирует намеренно.

   Обратная сторона: эти же меры мешают обычным посетителям —
   выделить адрес, скопировать номер телефона, открыть ссылку
   в новой вкладке. Поэтому всё выключено. Включать — осознанно,
   флагами ниже. Рекомендация: не включать на страницах резидента.

   Настоящая защита — на сервере: логика, данные, расчёты живут там
   и посетителю не отдаются. Она уже сделана.
   ============================================================ */

(function () {
  'use strict';

  var FLAGS = {
    noSelect: false,        // запрет выделения текста
    noContextMenu: false,   // запрет правой кнопки
    noDragImages: true,     // картинки не перетаскиваются в другое окно — безвредно, включено
    noPrint: false,         // при печати — пустая страница
    devtoolsNotice: false   // сообщение в консоли разработчика
  };

  if (FLAGS.noSelect) {
    var css = document.createElement('style');
    css.textContent = 'body{-webkit-user-select:none;user-select:none}input,textarea,[contenteditable]{-webkit-user-select:text;user-select:text}';
    document.head.appendChild(css);
  }

  if (FLAGS.noContextMenu) {
    document.addEventListener('contextmenu', function (e) {
      if (e.target.closest('input, textarea, [contenteditable]')) return;
      e.preventDefault();
    });
  }

  if (FLAGS.noDragImages) {
    document.addEventListener('dragstart', function (e) {
      if (e.target && e.target.tagName === 'IMG') e.preventDefault();
    });
  }

  if (FLAGS.noPrint) {
    var p = document.createElement('style');
    p.textContent = '@media print{body>*{display:none!important}body::after{content:"Печать этой страницы отключена";display:block;padding:40px;font-family:sans-serif}}';
    document.head.appendChild(p);
  }

  if (FLAGS.devtoolsNotice && window.console) {
    console.log('%cМСВ', 'font:700 24px sans-serif;color:#FB344A');
    console.log('Код сайта защищён авторским правом. Копирование и использование без разрешения правообладателя запрещено.');
  }
})();
