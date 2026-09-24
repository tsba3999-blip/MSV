'use strict';

/* ============================================================
   МСВ — самопроверка

   Запуск:
     node server/selftest.js [адрес]

   По умолчанию проверяет http://127.0.0.1:3031. Проверки двух
   видов: одни читают файлы, другие стучатся к живому серверу.
   Каждая проверка закрывает ошибку, которая уже случалась —
   список и разбор в ОШИБКИ.md.

   Возвращает 1, если хоть одна проверка не прошла: этого хватает,
   чтобы выкладка в GitHub остановилась и не увезла поломку на сайт.
   ============================================================ */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const WEB = path.join(ROOT, 'web');
const SRV = path.join(ROOT, 'server');
const BASE = process.argv[2] || 'http://127.0.0.1:3031';

const results = [];
let failed = 0;

function ok(name) { results.push(['✓', name]); }
function bad(name, why) { results.push(['✗', name + ' — ' + why]); failed++; }
function check(name, condition, why) { condition ? ok(name) : bad(name, why); }

function read(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch (e) { return ''; }
}
function webFiles(ext) {
  return fs.readdirSync(WEB).filter((f) => f.endsWith(ext)).map((f) => path.join(WEB, f));
}

function get(url) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https:') ? https : http;
    const req = lib.get(url, { timeout: 15000 }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', () => resolve({ status: 0, body: '' }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, body: '' }); });
  });
}

/* ============================================================
   1. Заглушки из вёрстки, выданные за данные

   Было: в боковом меню у всех стояла «Ирина Соколова», в анкете
   администратора — её же телефон и почта, в анкете сотрудника —
   «Ким Сергей Владимирович». Страницы показывали придуманные
   данные так, будто это настоящие.
   ============================================================ */
function checkPlaceholders() {
  /* Выдуманные люди в вёрстке — всегда ошибка: страница показывает их
     так, будто это настоящие данные. Терпимости тут нет. */
  const FORBIDDEN = [
    ['Соколова Ирина', 'имя из макета'],
    ['Ким Сергей Владимирович', 'имя из макета'],
    ['+7 926 127-39-00', 'телефон из макета'],
    ['+7 916 200-30-40', 'телефон из макета'],
    ['s.kim@msv.ru', 'почта из макета'],
    ['проживающие вымышленные', 'неверная подпись: люди настоящие'],
    ['a.loginov@mail.ru', 'почта из макета'],
    ['artem_loginov', 'ник из макета'],
    ['+7 926 127-39-11', 'телефон из макета'],
    ['комната 412', 'комната из макета'],
    ['admin@msv.ru', 'почта из макета'],
    ['Администратор сети', 'должность из макета']
  ];

  /* Имя ищем в обоих порядках слов. «Соколову Ирину» мы вычистили, а
     «Ирина Соколова» на странице прав осталась: проверка искала строку
     буква в букву (найдено 25.09.2026). */
  const needles = [];
  for (const [needle, why] of FORBIDDEN) {
    needles.push([needle, why]);
    const w = needle.split(' ');
    if (w.length === 2 && /^[А-ЯЁ]/.test(w[0]) && /^[А-ЯЁ]/.test(w[1])) needles.push([w[1] + ' ' + w[0], why]);
  }

  const hits = [];
  for (const file of webFiles('.html').concat(webFiles('.js'))) {
    const text = read(file);
    for (const [needle, why] of needles) {
      if (text.includes(needle)) hits.push(path.basename(file) + ': ' + needle + ' (' + why + ')');
    }
  }
  check('в страницах нет выдуманных имён и телефонов', hits.length === 0, hits.join('; '));

  /* Строка с чужой жизнью вместо прочерка.
     Было: в «Моих данных» стояли город, вуз и телеграм выдуманного
     резидента. Сервер подставлял только заполненное, и человек без
     анкеты видел чужую биографию как свою. Поля, которые заполняет
     сервер, в вёрстке должны быть пустыми (найдено 25.09.2026). */
  const sample = [];
  for (const file of webFiles('.html')) {
    const re = /data-k="[a-zA-Z]+">([^<]*)</g;
    let m;
    while ((m = re.exec(read(file)))) {
      const v = m[1].replace(/&nbsp;/g, '').trim();
      if (v && v !== '—') sample.push(path.basename(file) + ': «' + v + '»');
    }
  }
  check('поля с сервера не заполнены образцом', sample.length === 0, sample.join('; '));

  /* Подпись «данные вымышленные» должна быть правдой.
     Было: страница уже брала настоящие имя и телефон, а сверху всё ещё
     обещала макет — человек не верил собственным данным. Обратное хуже:
     страница-макет без подписи выдаёт выдумку за правду. Сверяем с тем,
     ходит ли страница на сервер (найдено 25.09.2026). */
  const lying = [];
  for (const file of webFiles('.html')) {
    const text = read(file);
    const says = text.includes('Данные вымышленные');
    const asks = text.includes('fetch(');
    if (says && asks) lying.push(path.basename(file) + ': данные настоящие, а подпись обещает макет');
    if (!says && !asks && text.includes('ЗДЕСЬ БУДЕТ ЗАПРОС К СЕРВЕРУ')) {
      lying.push(path.basename(file) + ': страница-макет без подписи');
    }
  }
  check('подпись про макет совпадает с правдой', lying.length === 0, lying.join('; '));

  /* Кнопки, которые пишут «сохранено», ничего не отправляя. Это долг,
     оставшийся с поры, когда сайт был макетом. Разом его не закрыть,
     поэтому считаем: новые появляться не должны, а старые убывают.
     Починили страницу — уменьшите число, и оно больше не вырастет. */
  const DEAD_MAX = 3;
  const dead = [];
  for (const file of webFiles('.html')) {
    if (read(file).includes('ЗДЕСЬ БУДЕТ ЗАПРОС К СЕРВЕРУ')) dead.push(path.basename(file));
  }
  check('кнопок-пустышек не стало больше (' + dead.length + ' из ' + DEAD_MAX + ')',
    dead.length <= DEAD_MAX, 'появились новые: ' + dead.join(', '));
  if (dead.length && dead.length <= DEAD_MAX) {
    results.push(['·', 'ещё не связаны с сервером: ' + dead.join(', ')]);
  }
}

/* ============================================================
   2. Роль забыли в списке

   Было: у модератора не оказалось кабинета в перечне, и после
   входа его отправляло в кабинет резидента. Ещё раньше нельзя
   было завести администратора: роль не значилась в списке
   разрешённых.
   ============================================================ */
function checkRoles() {
  const login = read(path.join(WEB, 'login.html'));
  ['resident', 'staff', 'moderator', 'admin'].forEach((role) => {
    check('вход знает, куда вести роль «' + role + '»',
      new RegExp('\\b' + role + '\\s*:').test(login.split('var CABINET')[1] || ''),
      'роли нет в списке кабинетов login.html');
  });

  const staff = read(path.join(SRV, 'routes/staff.js'));
  check('администратора можно завести', /'admin'/.test(staff.split('const ROLES')[1] || ''),
    'роль admin не в списке при создании сотрудника');
  check('администраторы видны в списке сотрудников',
    /role IN \('staff', 'moderator', 'admin'\)/.test(staff),
    'выборка сотрудников не берёт администраторов');
}

/* ============================================================
   3. Сервер и страница разошлись в именах

   Было: «Проверка данных» спрашивала фамилию и имя, а сервер их
   в ответе не присылал — на анкету отправляло всех подряд, и по
   кругу. Уведомление спрашивало ключ notify_resident_payment,
   а в базе он notify_resident_pay — письма молча не уходили.
   Новые выключатели не значились в списке разрешённых настроек
   и не сохранялись.
   ============================================================ */
function checkNames() {
  /* Берём не «всё после первого упоминания», а сам обработчик: адрес
     встречается ещё и в перечне в шапке файла, и проверка смотрела не
     туда. Ошибка в самой проверке — тоже ошибка (24.09.2026). */
  const resident = read(path.join(SRV, 'routes/resident.js'));
  const from = resident.indexOf("route('GET', '/api/me/home'");
  const home = from < 0 ? '' : resident.slice(from, resident.indexOf("route(", from + 10));
  ['lastName', 'firstName'].forEach((field) => {
    check('ответ о резиденте содержит ' + field,
      new RegExp(field + ':').test(home),
      'страница проверки данных ждёт это поле');
  });

  const settingsFile = read(path.join(SRV, 'routes/settings.js'));
  const allowed = (settingsFile.split('const ALLOWED')[1] || '').split('};')[0];
  const used = new Set();
  for (const file of webFiles('.html')) {
    const text = read(file);
    const re = /data-key="([a-z_]+)"/g;
    let m;
    while ((m = re.exec(text))) used.add(m[1]);
  }
  const missing = [...used].filter((k) => !allowed.includes(k));
  check('все выключатели на страницах сервер принимает', missing.length === 0,
    'сервер не примет: ' + missing.join(', '));

  /* вид уведомления должен совпадать с ключом настройки */
  const kinds = new Set();
  for (const file of fs.readdirSync(path.join(SRV, 'lib')).concat(fs.readdirSync(path.join(SRV, 'routes')))) {
    const full = fs.existsSync(path.join(SRV, 'lib', file)) ? path.join(SRV, 'lib', file) : path.join(SRV, 'routes', file);
    const text = read(full);
    const re = /notifyResident\([^,]+,\s*'([a-z_]+)'/g;
    let m;
    while ((m = re.exec(text))) kinds.add(m[1]);
  }
  const unknown = [...kinds].filter((k) => !settingsFile.includes('notify_resident_' + k));
  check('виды уведомлений совпадают с настройками', unknown.length === 0,
    'нет настройки notify_resident_' + unknown.join(', notify_resident_'));
}

/* ============================================================
   4. Одно правило — в трёх местах, поправили в одном

   Было: новый порядок «сперва место, потом данные» применили к
   «Проверке данных», но забыли про первый вход и про «Пропустить»
   на онбордах — обе дороги вели в анкету по-старому.
   ============================================================ */
function checkOrder() {
  const signup = read(path.join(WEB, 'signup.html'));
  check('«Пропустить» на онбордах ведёт к выбору резиденции',
    !/login\.html\?[^"']*next=profile-1/.test(signup),
    'ведёт в анкету по старому порядку');

  const login = read(path.join(WEB, 'login.html'));
  check('первый вход не уводит в анкету',
    !/firstLogin[^}]*profile-1\.html/.test(login),
    'первый вход ведёт в анкету в обход нового порядка');
  check('«куда дальше» слушается только для резидента',
    /r !== 'resident'/.test(login),
    'сотрудника уведёт на выбор койки');
}

/* ============================================================
   5. Чистая установка не проверялась

   Было: разовые правки данных стояли посреди схемы и обращались
   к таблице, которая создаётся ниже. На выросшей базе проходило,
   на чистой — падало.
   ============================================================ */
function checkSchema() {
  const schema = read(path.join(SRV, 'db/schema.sql'));
  const settingsAt = schema.indexOf('CREATE TABLE IF NOT EXISTS settings');
  const firstUse = schema.indexOf('FROM settings WHERE key');
  check('правки данных идут после создания таблиц',
    settingsAt > 0 && (firstUse < 0 || firstUse > settingsAt),
    'схема обращается к settings раньше, чем создаёт её');
}

/* ============================================================
   Время

   Было: сервер стоял по Гринвичу, а общежитие живёт по Москве.
   Каждую ночь с 00:00 до 03:00 система считала, что ещё вчера:
   выехавший продолжал входить, а срок оплаты «до 15 числа 24:00»
   сдвигался на сутки. Час пояса теперь задаёт сам код.
   ============================================================ */
function checkTime() {
  const db = read(path.join(SRV, 'lib/db.js'));
  check('часовой пояс задан в коде', /process\.env\.TZ\s*=/.test(db),
    'сервер возьмёт пояс машины — на новом хостинге это Гринвич');
  check('тот же пояс и в базе', /SET TIME ZONE/.test(db),
    'CURRENT_DATE посчитает база по-своему');

  /* Правила, которые двигают чужие деньги и доступ, включаются разом —
     пока перенос не закончен, они молчат. */
  for (const f of ['penalty.js', 'sale.js', 'access.js']) {
    check('правило ' + f + ' под общим выключателем',
      read(path.join(SRV, 'lib', f)).includes("key = 'money_rules'"),
      'сработает на неполных данных');
  }
}

/* ============================================================
   Загруженные файлы

   Было: папка с загрузками лежала внутри web/. Systemd держит её
   только для чтения — фото не загружалось; а выкладка копирует web/
   из репозитория с удалением лишнего, то есть стёрла бы все загруженные
   фото при первом же обновлении сайта.
   ============================================================ */
function checkUploads() {
  const db = read(path.join(SRV, 'lib/db.js'));
  check('папка загрузок настраивается', /UPLOAD_DIR/.test(db),
    'путь зашит в код — на сервере его не поменять');

  const deploy = read(path.join(SRV, 'deploy.sh'));
  check('выкладка не стирает загруженное', /--exclude=.uploads./.test(deploy),
    'rsync --delete унесёт фото вместе с лишними файлами');
  check('служба может писать в папку загрузок',
    /ReadWritePaths=.*\/var\/lib\/msv/.test(read(path.join(SRV, 'msv.service'))),
    'systemd закроет запись, и загрузка упадёт');
}

/* ============================================================
   6. Живой сервер
   ============================================================ */
async function checkLive() {
  const root = await get(BASE + '/');
  check('первая страница отвечает', root.status === 200, 'ответ ' + root.status);

  /* Было: адрес вида «//» ронял разбор и возвращал ошибку сервера */
  const slash = await get(BASE + '//');
  check('кривой адрес не роняет сервер', slash.status !== 500 && slash.status !== 0,
    'ответ ' + slash.status);

  const health = await get(BASE + '/api/health');
  check('база доступна', health.status === 200, 'ответ ' + health.status);

  /* Сверяем день базы с московским: разошлись — значит пояс не тот */
  let today = '';
  try { today = JSON.parse(health.body).today || ''; } catch (e) {}
  const msk = new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10);
  check('сервер считает дни по Москве', !today || today === msk,
    'база думает, что сегодня ' + today + ', а в Москве ' + msk);

  /* Было: страница входа сама логинила под первой учётной записью */
  const login = await get(BASE + '/login.html');
  check('страница входа показывает форму', login.body.includes('id="contact"'), 'формы нет');
  check('страница входа никого не впускает сама',
    !login.body.includes("'/api/auth/demo-login'"),
    'осталась автоматическая авторизация');

  /* Было: служебный код был напечатан прямо на странице */
  check('служебный код не напечатан на странице', !login.body.includes('7777'),
    'код виден любому посетителю');
}

/* ============================================================ */
(async function main() {
  checkPlaceholders();
  checkRoles();
  checkNames();
  checkOrder();
  checkSchema();
  checkTime();
  checkUploads();
  await checkLive();

  console.log('');
  results.forEach(([mark, name]) => console.log('  ' + mark + ' ' + name));
  console.log('');
  if (failed) {
    console.log('НЕ ПРОШЛО ПРОВЕРОК: ' + failed + ' из ' + results.length);
    process.exit(1);
  }
  console.log('Все проверки пройдены: ' + results.length);
})();
