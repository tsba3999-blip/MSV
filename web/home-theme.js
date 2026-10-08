(function () {
  'use strict';
  var palettes = [['#341078','#7360dc','#e7a9ff','#624bff','#382485'],['#7319bb','#f52487','#ff799d','#ffe19a','#16ccd8'],['#034451','#087780','#28a2b2','#d2ecf2','#075057'],['#281391','#813bef','#c3b4ff','#60cbf5','#3923d1'],['#753b88','#ce5628','#ffa970','#b7a0e6','#b94327'],['#301592','#892bcc','#1de0e9','#f773ce','#fa744c'],['#9023a6','#258fac','#f653aa','#7bddf1','#bda4e8'],['#52139c','#148e97','#d735ba','#ecce50','#589fe2'],['#087b69','#288faa','#b8dc43','#65efc9','#57d7e6'],['#19172f','#bd431e','#f18b43','#b3a6d6','#a72849']];
  var previous = -1;
  try { previous = Number(sessionStorage.getItem('msv.homePalette') ?? -1); } catch (_) {}
  var choices = palettes.map(function (_, i) { return i; }).filter(function (i) { return i !== previous; });
  var chosen = choices[Math.floor(Math.random() * choices.length)];
  try { sessionStorage.setItem('msv.homePalette', String(chosen)); } catch (_) {}
  function apply(i) {
    document.documentElement.style.setProperty('--home-base', palettes[i][0]);
    document.documentElement.style.setProperty('--home-end', palettes[i][1]);
    for (var j=0;j<3;j++) document.documentElement.style.setProperty('--home-glow-'+j,palettes[i][j+2]);
    try { sessionStorage.setItem('msv.homePalette',String(i)); } catch (_) {}
  }
  apply(chosen);
  addEventListener('pageshow', function (e) {
    if (e.persisted) { chosen = (chosen + 1 + Math.floor(Math.random() * (palettes.length - 1))) % palettes.length; apply(chosen); }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = palettes[chosen][0];
  });
})();
