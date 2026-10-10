(function () {
  'use strict';
  var clock = document.getElementById('moscowClock'), day = document.getElementById('moscowDay'), weather = document.getElementById('moscowWeather');
  var last = 0;
  function tick() {
    var now = new Date();
    clock.textContent = now.toLocaleTimeString('ru-RU', { timeZone:'Europe/Moscow', hour:'2-digit', minute:'2-digit' });
    var name = now.toLocaleDateString('ru-RU', { timeZone:'Europe/Moscow', weekday:'long' });
    day.textContent = name[0].toUpperCase() + name.slice(1);
  }
  async function updateWeather() {
    if (document.hidden || Date.now() - last < 10 * 60 * 1000) return;
    last = Date.now();
    try {
      var r = await fetch('/api/weather/moscow', { signal:AbortSignal.timeout(10000), cache:'no-store' });
      var data = await r.json();
      if (!r.ok || typeof data.temperature !== 'number' || !Number.isFinite(data.temperature)) throw Error('weather');
      var t = Math.round(data.temperature);
      var code = String(data.symbol || '').toLowerCase();
      var condition = code.includes('thunder') ? ['⛈️','Гроза'] : code.includes('sleet') ? ['🌨️','Мокрый снег'] : code.includes('snow') ? ['❄️','Снег'] : code.includes('rain') ? ['🌧️','Дождь'] : data.windSpeed >= 10 ? ['🌬️','Ветрено'] : code.includes('fog') ? ['🌫️','Туман'] : code.includes('partlycloudy') || code.includes('fair') ? ['⛅','Переменная облачность'] : code.includes('cloudy') ? ['☁️','Облачно'] : code.includes('clearsky') ? (code.includes('night') ? ['🌙','Ясно, ночь'] : ['☀️','Ясно']) : null;
      weather.replaceChildren();
      if (condition) {
        var icon = document.createElement('span'); icon.className = 'weather-icon'; icon.textContent = condition[0]; icon.setAttribute('role','img'); icon.setAttribute('aria-label',condition[1]); icon.title = condition[1];
        weather.append(icon, ' ');
      }
      var temperature = document.createElement('span'); temperature.className = 'weather-temperature';
      temperature.textContent = 'Москва ' + (t > 0 ? '+' : '') + t + ' °C';
      weather.append(temperature);
      weather.title = 'MET Norway · прогноз на ' + new Date(data.time).toLocaleTimeString('ru-RU',{timeZone:'Europe/Moscow',hour:'2-digit',minute:'2-digit'});
    } catch (_) { weather.textContent = 'Москва · погода недоступна'; }
  }
  tick(); updateWeather();
  setInterval(function () { if (!document.hidden) { tick(); updateWeather(); } }, 10000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { tick(); updateWeather(); } });
})();
