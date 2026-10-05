'use strict';
// Run with Playwright available: node server/entry-session.test.js
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage();
    let me = null, logoutFails = false, offline = false,logins=0;
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const roles = { admin: 'admin-shahmatka.html', moderator: 'staff-shahmatka.html', staff: 'cabinet-staff.html', resident: 'cabinet-resident.html' };
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/api/auth/me') {
        if (offline) return route.abort();
        return route.fulfill({ status: me ? 200 : 401, json: me || {} });
      }
      if (url.pathname === '/api/auth/logout') {
        if (!logoutFails) me = null;
        return route.fulfill({ status: logoutFails ? 500 : 200, json: {} });
      }
      if(url.pathname==='/api/auth/verify-pin'||url.pathname==='/api/auth/demo-login')logins++;
      if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 401, json: {} });
      if (Object.values(roles).some(p => url.pathname === '/' + p)) return route.fulfill({ body: 'Cabinet' });
      const file = path.join(__dirname, '../web', url.pathname === '/' ? 'index.html' : url.pathname.slice(1));
      if (!fs.existsSync(file)) return route.fulfill({ status: 404 });
      const type = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.woff2': 'font/woff2' }[path.extname(file)];
      return route.fulfill({ body: fs.readFileSync(file), contentType: type || 'application/octet-stream' });
    });
    await page.goto('https://msv.test/index.html');
    assert.equal(await page.locator('#entrySession').isVisible(), false);
    await page.goto('https://msv.test/login.html');
    await page.waitForTimeout(100);
    assert.equal(new URL(page.url()).pathname, '/login.html');
    for (const role of Object.keys(roles)) {
      me = { role, name: 'Тестовый пользователь', position: role === 'admin' ? 'Администратор 1' : '' };
      await page.goto('https://msv.test/login.html');
      await page.waitForURL('**/' + roles[role]);
    }
    me = { role: 'admin', name: 'Тестовый администратор', position: 'Администратор 1',canEditSite:true };
    await page.goto('https://msv.test/index.html');
    await page.locator('#entrySession').waitFor({ state: 'visible' });
    assert.match(await page.locator('[data-session-role]').innerText(), /Администратор 1/);
    assert.equal((await page.locator('.start__actions a').innerText()).trim(), 'Мой кабинет');
    await page.locator('.edit-bar').waitFor();assert.equal(await page.locator('.edit-bar').count(),1);
    await page.locator('.start__actions a').click();await page.waitForURL('**/admin-shahmatka.html');assert.equal(logins,0);
    await page.goto('https://msv.test/index.html');await page.locator('#entrySession').waitFor({state:'visible'});
    await page.setViewportSize({ width: 375, height: 812 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: '.tmp/entry-session-mobile.png', fullPage: true });
    me=null;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.waitForFunction(()=>document.getElementById('entrySession').hidden);assert.equal(await page.locator('.edit-bar').isVisible(),false);
    me={role:'admin',name:'Тестовый администратор',position:'Администратор 1',canEditSite:true};await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.locator('#entrySession').waitFor({state:'visible'});await page.locator('.edit-bar').waitFor({state:'visible'});
    logoutFails = true;
    await page.locator('#entrySession button').click();
    await page.locator('[data-session-error]').filter({ hasText: 'Не удалось выйти' }).waitFor();
    assert.equal(await page.locator('#entrySession').isVisible(), true);
    logoutFails = false;
    await page.locator('#entrySession button').click();
    await page.waitForFunction(() => document.getElementById('entrySession').hidden);
    assert.equal(me, null);
    offline = true;
    await page.goto('https://msv.test/login.html');
    await page.waitForTimeout(100);
    assert.equal(new URL(page.url()).pathname, '/login.html');
    assert(await page.locator('#contact').isVisible());assert.equal(logins,0);assert.deepEqual(errors,[]);
    console.log('PASS: guest, four roles, mobile, logout success/failure, offline');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
