'use strict';
const { json } = require('../lib/http');
const URL = 'https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=55.7558&lon=37.6173';
let cache = null, next = 0, pending = null, modified = '';
async function refresh() {
  const headers = { 'User-Agent':'go.1msv.ru/1.0 https://go.1msv.ru/' };
  if (modified) headers['If-Modified-Since'] = modified;
  const r = await fetch(URL, { headers, signal:AbortSignal.timeout(7000) });
  if (r.status !== 304) {
    if (!r.ok) throw Error('Weather unavailable');
    const data = await r.json();
    if (!Array.isArray(data.properties?.timeseries)) throw Error('Invalid weather');
    cache = data.properties;
    modified = r.headers.get('last-modified') || '';
  }
  next = Math.max(Date.now() + 15 * 60000, Date.parse(r.headers.get('expires')) || 0);
}
module.exports = function (route) {
  route('GET', '/api/weather/moscow', async (_req, res) => {
    try {
      if (Date.now() >= next) {
        if (!pending) pending = refresh().catch(e => { next = Date.now() + 5 * 60000; throw e; }).finally(() => { pending = null; });
        await pending;
      }
      const now = Date.now();
      const points = cache?.timeseries || [];
      const point = points.reduce((best,p) => Math.abs(Date.parse(p.time)-now) < (best ? Math.abs(Date.parse(best.time)-now) : Infinity) ? p : best, null);
      const temperature = point?.data?.instant?.details?.air_temperature;
      if (typeof temperature !== 'number' || !Number.isFinite(temperature) || Math.abs(Date.parse(point.time)-now) > 90 * 60000 || !(now-Date.parse(cache.meta.updated_at) < 12 * 3600000)) throw Error('Weather stale');
      const symbol = point.data.next_1_hours?.summary?.symbol_code || point.data.next_6_hours?.summary?.symbol_code || '';
      const windSpeed = point.data.instant.details.wind_speed;
      json(res,200,{temperature,symbol,windSpeed,time:point.time,source:'MET Norway'});
    } catch (_) { json(res,503,{error:'Погода временно недоступна'}); }
  });
};
