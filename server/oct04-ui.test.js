'use strict';
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
const page=await browser.newPage({viewport:{width:1200,height:900}});let mode='fail',attempts=0;
await page.route('**/*',async route=>{const url=new URL(route.request().url());
 if(url.pathname==='/api/auth/verify-pin'){attempts++;return route.fulfill({status:mode==='success'?200:mode==='lock'?429:401,json:mode==='success'?{role:'resident'}:mode==='lock'?{error:'Блокировка',lockedUntil:new Date(Date.now()+1800000).toISOString(),attemptsRemaining:0}:{error:'Неверный код',attemptsRemaining:3}});}
 if(url.pathname.startsWith('/api/'))return route.fulfill({status:401,json:{error:'Не выполнен вход'}});
 const file=path.join('web',url.pathname.slice(1));if(fs.existsSync(file)&&fs.statSync(file).isFile())return route.fulfill({body:fs.readFileSync(file),contentType:file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'application/octet-stream'});
 return route.fulfill({status:404,body:''});
});
await page.goto('https://msv.test/login.html');await page.locator('#contact').fill('+79000000704');await page.locator('#btnSend').click();await page.locator('#step2.step--on').waitFor();
for(let i=0;i<4;i++)await page.locator('.pin__cell').nth(i).fill(String(i+2));
await page.waitForFunction(()=>document.getElementById('err2Text').textContent.includes('3'));
assert.equal(attempts,1);assert(await page.locator('#pin').evaluate(e=>e.classList.contains('pin--failure')));
mode='lock';for(let i=0;i<4;i++)await page.locator('.pin__cell').nth(i).fill(String(i+2));
await page.waitForFunction(()=>document.querySelector('.pin__cell').disabled);assert.equal(attempts,2);await page.waitForFunction(()=>document.getElementById('err2Text').textContent.includes('Осталось'));
console.log('PASS automatic fourth-digit check, red animation, countdown and disabled inputs');
await page.goto('https://msv.test/login.html');mode='success';await page.locator('#contact').fill('+79000000704');await page.locator('#btnSend').click();await page.locator('#step2.step--on').waitFor();for(let i=0;i<4;i++)await page.locator('.pin__cell').nth(i).fill(String(i+2));await page.waitForSelector('.pin--success');await page.waitForURL('**/cabinet-resident.html');console.log('PASS successful animation followed by automatic navigation');
await page.goto('https://msv.test/content-history.html');await page.addScriptTag({content:fs.readFileSync('web/crop.js','utf8')});
await page.evaluate(()=>{const c=document.createElement('canvas');c.width=800;c.height=600;c.getContext('2d').fillRect(0,0,800,600);c.toBlob(b=>{window.cropResult='pending';MSVCrop(b).then(result=>{window.cropResult=result?result.size:0;});});});
await page.locator('.crop__stage').waitFor();await page.locator('.crop input').fill('50');await page.locator('.crop input').dispatchEvent('input');
const stage=await page.locator('.crop__stage').boundingBox();await page.mouse.move(stage.x+100,stage.y+100);await page.mouse.down();await page.mouse.move(stage.x+130,stage.y+140);await page.mouse.up();await page.locator('.crop [data-act="ok"]').click();await page.waitForFunction(()=>typeof window.cropResult==='number');assert(await page.evaluate(()=>cropResult>0));console.log('PASS photo resize, movement and confirmed JPEG output');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
