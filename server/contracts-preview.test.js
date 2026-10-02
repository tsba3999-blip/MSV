'use strict';
const {chromium}=require('playwright');
const fs=require('fs'), path=require('path'), assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.route('**/*',async route=>{
  const p=new URL(route.request().url()).pathname;
  if(p==='/api/auth/me')return route.fulfill({json:{role:'admin'}});
  const file=path.join(__dirname,'../web',path.basename(p));
  if(!fs.existsSync(file))return route.fulfill({status:404});
  return route.fulfill({body:fs.readFileSync(file),contentType:{'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript'}[path.extname(file)]||'application/octet-stream'});
 });
 await page.goto('https://msv.test/contracts-preview.html');
 await page.locator('main').waitFor({state:'visible'});
 assert.equal(await page.locator('tbody tr').count(),23);
 for(const design of ['classic','chess','quarters','ledger','groups']) {
  await page.locator('[data-design='+design+']').click();
  assert.equal(await page.locator('tbody tr').count(),23);
  assert.equal(await page.locator('[data-design='+design+']').getAttribute('aria-pressed'),'true');
  await page.screenshot({path:'contracts-'+design+'.png'});
 }
 await page.locator('[data-design=chess]').click();
 await page.locator('[data-view=cards]').click();assert.equal(await page.locator('.card').count(),23);
 await page.locator('[data-view=table]').click();assert.equal(await page.locator('tbody tr').count(),23);
 await page.locator('#search').fill('Бухгалтерия');assert.equal(await page.locator('tbody tr').count(),1);
 await page.locator('#search').fill('');
 await page.locator('#add').click();
 await page.locator('[name=name]').fill('Проверка <script>');await page.locator('[name=amount]').fill('2500');await page.locator('[name=due]').fill('2026-11-10');
 await page.locator('#contractForm button[type=submit],#contractForm .msv-btn').click();
 assert.equal(await page.locator('tbody tr').count(),24);
 await page.getByRole('button',{name:'Проверка <script>',exact:true}).click();
 await page.locator('[name=sum]').fill('1000');await page.locator('#paymentForm button').click();assert.match(await page.locator('#total').innerText(),/1\s*000/);
 await page.locator('#close').click();await page.reload();await page.locator('main').waitFor({state:'visible'});
 assert.equal(await page.locator('tbody tr').count(),24);
 await page.locator('[data-view=cards]').click();await page.setViewportSize({width:390,height:844});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:'contracts-preview-mobile.png'});
 console.log('PASS: three views, search, create, payment history, persistence, mobile layout');
 } finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
