(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MSVGender = factory();
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';
  var male = new Set(('Александр Алексей Анатолий Андрей Антон Аркадий Артем Артемий Артур Борис Вадим Валентин Валерий Василий Виктор Виталий Владимир Владислав Вячеслав Георгий Глеб Григорий Давид Даниил Данил Данила Денис Дмитрий Евгений Егор Иван Игнат Игорь Илья Кирилл Константин Лев Леонид Максим Марк Матвей Михаил Никита Николай Олег Павел Петр Роман Руслан Савва Семен Сергей Станислав Степан Тимофей Тимур Федор Юрий Ярослав').toLowerCase().split(' '));
  var female = new Set(('Александра Алена Алина Алиса Алла Анастасия Ангелина Анна Арина Валентина Валерия Варвара Василиса Вера Вероника Виктория Галина Дарья Диана Евгения Екатерина Елена Елизавета Жанна Зоя Инна Ирина Карина Кира Кристина Ксения Лариса Лидия Лилия Любовь Людмила Майя Маргарита Марина Мария Милана Надежда Наталия Наталья Нина Оксана Олеся Ольга Полина Раиса Регина Римма Светлана София Софья Тамара Татьяна Ульяна Юлия Яна').toLowerCase().split(' '));
  function clean(v) { return String(v || '').trim().toLowerCase().replace(/ё/g, 'е'); }
  function infer(p) {
    p = p || {};
    var first = clean(p.firstName), last = clean(p.lastName), signals = [];
    if (male.has(first)) signals.push('м');
    if (female.has(first)) signals.push('ж');
    if (/^[а-я-]{5,}$/.test(last)) {
      if (/(ова|ева|ина|ская|цкая)$/.test(last)) signals.push('ж');
      else if (/(ов|ев|ин|ский|цкий)$/.test(last)) signals.push('м');
    }
    (p.roomGenders || []).forEach(function (g) { if (g === 'м' || g === 'ж') signals.push(g); });
    return signals.length && signals.every(function (s) { return s === signals[0]; }) ? signals[0] : null;
  }
  function resolve(p) { return p && (p.gender === 'м' || p.gender === 'ж') ? p.gender : infer(p); }
  return {infer:infer, resolve:resolve};
});
