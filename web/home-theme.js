(function () {
  'use strict';
  var palettes = [['#193b56','#392552'],['#16483f','#183750'],['#532339','#292b57'],['#42315b','#163e50'],['#563223','#462a47'],['#203d55','#24483b']];
  var previous = -1;
  try { previous = Number(sessionStorage.getItem('msv.homePalette') ?? -1); } catch (_) {}
  var choices = palettes.map(function (_, i) { return i; }).filter(function (i) { return i !== previous; });
  var chosen = choices[Math.floor(Math.random() * choices.length)];
  try { sessionStorage.setItem('msv.homePalette', String(chosen)); } catch (_) {}
  function apply(i) {
    document.documentElement.style.setProperty('--home-base', palettes[i][0]);
    document.documentElement.style.setProperty('--home-end', palettes[i][1]);
  }
  apply(chosen);
  addEventListener('pageshow', function (e) {
    if (e.persisted) { chosen = (chosen + 1 + Math.floor(Math.random() * (palettes.length - 1))) % palettes.length; apply(chosen); }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = palettes[chosen][0];
  });
})();
