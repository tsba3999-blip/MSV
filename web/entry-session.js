/* Existing sessions only: never create a login or store credentials here. */
(function () {
  'use strict';
  if (location.protocol === 'file:') return;
  var loginPage = /\/login\.html$/.test(location.pathname);
  var homes = { admin: 'admin-shahmatka.html', moderator: 'staff-shahmatka.html', staff: 'cabinet-staff.html', resident: 'cabinet-resident.html' };
  var roles = { admin: 'Администратор 1', moderator: 'Модератор', staff: 'Сотрудник', resident: 'Резидент' };
  var panel = document.getElementById('entrySession');
  var entry = document.querySelector('.start__actions a');
  var logo = document.querySelector('.start__logo-link');
  var busy = false;
  var version = 0;
  var account=null,unknown=false;
  function announce(me){document.dispatchEvent(new CustomEvent('msv:entry-session',{detail:me}));}
  function showLogin(){document.documentElement.classList.remove('entry-checking');}

  function guest() {
    account=null;unknown=false;showLogin();announce(null);
    if (panel) panel.hidden = true;
    if (entry) { entry.href = 'login.html'; entry.textContent = 'Вход'; }
    if (logo) { logo.href = 'login.html'; logo.setAttribute('aria-label', 'Вход'); }
  }
  function check() {
    if (busy) return;
    var current = ++version;
    window.MSV_ENTRY_SESSION=fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) { if(r.status===401)return null;if(!r.ok)throw Error('session');return r.json(); });
    window.MSV_ENTRY_SESSION
      .then(function (me) {
        if (current !== version) return;
        if (!me || !homes[me.role]) { guest(); return; }
        account=me;unknown=false;announce(me);
        if (loginPage) {
          var next = new URLSearchParams(location.search).get('next');
          location.replace(me.role === 'resident' && next && /^[\w-]+\.html$/.test(next) && next !== 'login.html' ? next : homes[me.role]);
          return;
        }
        if (!panel) return;
        panel.querySelector('[data-session-role]').textContent = (me.preview?'Вы просматриваете: ':'Вы вошли: ') + (me.position || roles[me.role]);
        panel.querySelector('[data-session-name]').textContent = me.name || '';
        panel.querySelector('[data-session-note]').textContent = me.role === 'admin' ? 'Полный доступ. Передайте устройство только после выхода.' : 'Перед передачей устройства другому человеку выйдите из аккаунта.';
        panel.hidden = false;
        panel.querySelector('button').textContent=me.preview?'Вернуться в мой кабинет':'Выйти из аккаунта';
        // Keep the link through login.html so every entry revalidates the session.
        entry.textContent = 'Мой кабинет';
        if (logo) logo.setAttribute('aria-label', 'В кабинет');
      }).catch(function () { if(current!==version)return;showLogin();account=null;unknown=true;announce(null);if(panel){panel.hidden=false;panel.querySelector('[data-session-role]').textContent='Не удалось проверить вход';panel.querySelector('[data-session-name]').textContent='';panel.querySelector('[data-session-note]').textContent='Проверьте соединение и повторите проверку.';panel.querySelector('button').textContent='Проверить снова';} });
  }
  if (panel) panel.querySelector('button').addEventListener('click', function () {
    if (busy) return;
    if(unknown){check();return;}
    busy = true; ++version;
    var button = this;
    var error = panel.querySelector('[data-session-error]');
    button.disabled = true; error.textContent = '';
    fetch(account&&account.preview?'/api/cabinet-preview/stop':'/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error('logout'); location.replace(account&&account.preview?account.preview.returnTo:'index.html'); })
      .catch(function () { busy = false; button.disabled = false; error.textContent = 'Не удалось выйти. Проверьте соединение и повторите.'; });
  });
  check();
  addEventListener('pageshow', function (e) { if (e.persisted) check(); });
  addEventListener('focus', check);
})();
