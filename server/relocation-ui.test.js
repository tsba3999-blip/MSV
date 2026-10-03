'use strict';
const {chromium}=require('playwright'),fs=require('fs'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage();let previews=[],commits=[];
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.pathname.endsWith('/preview')){const body=route.request().postDataJSON();previews.push(body);return route.fulfill({json:{token:body.since,since:body.since,until:'2027-08-31',oldPrice:31000,newPrice:62000,months:[{period:'2027-08-01',days:31,count:31,newAmount:62000,delta:31000,accrued:31000,revised:62000}]}});}
  if(url.pathname.endsWith('/relocation')){commits.push(route.request().postDataJSON());return route.fulfill({status:409,json:{error:'Место занято'}});}
  return route.fulfill({contentType:'text/html',body:'<html><body></body></html>'});
 });
 await page.goto('https://msv.test/');await page.addScriptTag({content:fs.readFileSync('web/relocation-ui.js','utf8')});
 await page.evaluate(()=>MSVRelocate.open('1','new-bed','2026-10-16'));
 await page.waitForFunction(()=>!document.querySelector('[data-confirm]').disabled);
 assert.doesNotMatch(await page.locator('[data-summary]').innerText(),/август \/ депозит|Цена в месяц|Изменение:/);
 await page.locator('input').fill('2026-11-01');await page.locator('input').dispatchEvent('change');
 await page.waitForFunction(()=>!document.querySelector('[data-confirm]').disabled);
 await page.locator('[data-confirm]').click();await page.waitForFunction(()=>document.querySelector('[data-error]').textContent.includes('Место занято'));
 assert.equal(commits.length,1);assert.equal(commits[0].since,'2026-11-01');assert.equal(commits[0].token,'2026-11-01');
 await page.locator('[data-cancel]').click();await page.locator('dialog').waitFor({state:'detached'});assert.equal(await page.locator('dialog').count(),0);
 assert(previews.length>=2);console.log('PASS: date change rechecks quote, price breakdown hidden, exact confirmed date/token, conflict and cancellation');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
