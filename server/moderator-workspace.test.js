'use strict';
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
(async function () {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage();
    let me = { role: 'moderator', name: 'Тестовый модератор', canPayroll: false };
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/api/auth/me') return route.fulfill({ json: me });
      if (!url.pathname.endsWith('.html')) return route.fulfill({ status: 404 });
      const html = fs.readFileSync(path.join(__dirname, '../web', path.basename(url.pathname)), 'utf8');
      const side = html.match(/<aside class="side">[\s\S]*?<\/aside>/)[0];
      await route.fulfill({ contentType: 'text/html; charset=utf-8', body: '<div class="shell">' + side + '</div><script>' + fs.readFileSync(path.join(__dirname, '../web/mark.js'), 'utf8') + '</script>' });
    });
    let expected;
    for (const file of ['admin-shahmatka.html', 'staff-profile.html', 'staff-salary.html', 'cabinet-staff.html']) {
      await page.goto('https://msv.test/' + file);
      await page.waitForFunction(() => document.body.style.getPropertyValue('--role') === 'var(--msv-sky)');
      const links = await page.locator('.side__nav a').evaluateAll(nodes => nodes.map(n => n.getAttribute('href')));
      if (!expected) expected = links; else assert.deepEqual(links, expected);
      assert(links.includes('staff-salary.html') && links.includes('admin-residents.html'));
      assert(!links.includes('admin-rights.html') && !links.includes('admin-staff.html'));
      const taskIndex = links.findIndex(href => href.includes(':3456'));
      assert.equal(links[taskIndex + 1], 'contracts-preview.html');
      assert.equal(await page.locator('a[href="contracts-preview.html"] svg').count(), 1);
      assert.equal(await page.locator('.side__nav a[href="cabinet-admin.html"] svg').count(), 1);
      assert.equal(await page.locator('.msv-mark-btn').getAttribute('href'), 'admin-shahmatka.html');
      assert.equal(await page.locator('.side__who').getAttribute('href'), 'staff-profile.html');
    }
    await page.goto('https://msv.test/staff-shahmatka.html?res=uyut');
    await page.waitForURL('**/admin-shahmatka.html?res=uyut');
    for (const account of [{ role: 'admin', canPayroll: true }, { role: 'moderator', canPayroll: true }, { role: 'staff', canPayroll: false }]) {
      me = account;
      await page.goto('https://msv.test/admin-shahmatka.html');
      await page.waitForFunction(role => document.documentElement.dataset.role === role, account.role);
      assert(await page.locator('.side__nav a[href="admin-rights.html"]').count());
      assert.equal(await page.locator('.side__nav a[href="staff-salary.html"]').count(), 0);
    }
    console.log('PASS: unified moderator menu, personal pages, legacy redirect; other roles unchanged');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
