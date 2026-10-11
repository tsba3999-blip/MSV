(function () {
  'use strict';
  var button = document.querySelector('[data-save-prefs]');
  if (!button) return;
  var boxes = Array.from(document.querySelectorAll('[data-pref]'));
  var radios = Array.from(document.querySelectorAll('input[name="scope"]'));
  var controls = boxes.concat(radios);
  var message = document.querySelector('[data-prefs-message]');
  var warn = document.getElementById('noneWarn');
  var baseline = null, busy = false;
  function values() {
    var result = {};
    boxes.forEach(function (box) { result[box.dataset.pref] = box.checked; });
    var selected = radios.find(function (radio) { return radio.checked; });
    if (selected) result.scope = selected.value;
    return result;
  }
  function refresh() {
    button.disabled = busy || baseline === null || JSON.stringify(values()) === baseline;
    if (warn) warn.hidden = values().scope !== 'none';
  }
  function say(text) { message.textContent = text; message.hidden = false; }
  controls.forEach(function (control) {
    control.disabled = true;
    control.addEventListener('change', function () { message.hidden = true; refresh(); });
  });
  refresh();
  if (location.protocol === 'file:') { say('Для сохранения откройте сайт через сервер.'); return; }
  fetch('/api/me/notify-prefs', { credentials: 'same-origin' })
    .then(function (response) { if (!response.ok) throw new Error('load'); return response.json(); })
    .then(function (prefs) {
      boxes.forEach(function (box) { box.checked = prefs[box.dataset.pref] === true; });
      radios.forEach(function (radio) { radio.checked = radio.value === prefs.scope; });
      baseline = JSON.stringify(values());
      controls.forEach(function (control) { control.disabled = false; });
      refresh();
    })
    .catch(function () { say('Не удалось загрузить настройки. Обновите страницу.'); });
  button.addEventListener('click', function () {
    if (button.disabled) return;
    var submitted = values();
    busy = true; refresh(); say('Сохраняю…');
    fetch('/api/me/notify-prefs', {
      method: 'PUT', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(submitted)
    }).then(function (response) {
      if (!response.ok) throw new Error('save');
      baseline = JSON.stringify(submitted);
      say('Сохранено');
    }).catch(function () { say('Не удалось сохранить. Попробуйте ещё раз.'); })
      .finally(function () { busy = false; refresh(); });
  });
})();
