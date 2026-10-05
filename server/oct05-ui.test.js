'use strict';
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];let viewing=false,selected=null;
 page.on('pageerror',e=>errors.push(e.message));
 const people=[{id:'1',name:'Тест Владелец',role:'admin',position:'Администратор 1',place:'all'}, {id:'2',name:'Тест Анна',role:'moderator',position:'Администратор 2',place:'all'}, {id:'3',name:'Тест Чупахина',phone:'+79772511236',role:'moderator',position:'Модератор',place:'all'}, {id:'4',name:'Тест Уют',role:'staff',place:'uyut'}, {id:'5',name:'Тест Форма',role:'staff',place:'forma'}].map(p=>({...p,userId:p.id,sectionAccess:{chart:true,residents:true,tickets:true,charges:true,payroll:true},salary:30000,started:'2026-01-01'}));
 const residences=[{id:'forma',name:'FORMA',title:'FORMA',rooms:[{id:'room',name:'Комната',number:'1'}],beds:[{id:'bed',roomId:'room',label:'1.1',price:20000}]}];
 await page.route('**/*',async route=>{const u=new URL(route.request().url());if(u.pathname.startsWith('/api/')){
  if(u.pathname==='/api/auth/me')return route.fulfill({json:viewing?{id:'10',name:'Тест Резидент',role:'resident',preview:{returnTo:'admin-residents.html'}}:{...people[0],canEditSite:true,canPayroll:true}});
  if(u.pathname==='/api/staff')return route.fulfill({json:people});
  if(u.pathname==='/api/residences')return route.fulfill({json:residences});
  if(u.pathname==='/api/shahmatka')return route.fulfill({json:{residents:[{id:'10',name:'Тест Резидент',phone:'+79000000001',contactPerson:'Родитель +79000000002',registrations:[]}],bookings:[{id:'20',bedId:'bed',residentId:'10',from:'2026-09-01',to:'2027-08-31',accrued:30000,paid:30000,depositCharged:true,depositAmount:10000,depositPaid:10000}],payments:[]}});
  if(u.pathname==='/api/cabinet-preview/start'){selected=route.request().postDataJSON();viewing=true;return route.fulfill({json:{url:'support.html'}});}
  if(u.pathname==='/api/cabinet-preview/stop'){viewing=false;return route.fulfill({json:{ok:true}});}
  if(u.pathname==='/api/support')return route.fulfill({json:{residence:'forma',contact:null,threads:[]}});
  if(u.pathname==='/api/content/meta')return route.fulfill({json:{count:0}});
  return route.fulfill({json:[]});}
 const file=path.join('web',u.pathname.slice(1));return fs.existsSync(file)&&fs.statSync(file).isFile()?route.fulfill({body:fs.readFileSync(file),contentType:file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'application/octet-stream'}):route.fulfill({status:404,body:''});});
 await page.goto('https://msv.test/admin-rights.html');await page.locator('#people tr').first().waitFor();assert.deepEqual(await page.locator('#people .staff-marker').allTextContents(),['У','Ф','А','А','А']);
 assert.equal(await page.locator('#people .role-pill--admin').count(),3);assert.match(await page.locator('#people').innerText(),/Администратор 2/);await page.screenshot({path:'.tmp/oct05-rights.png'});
 console.log('PASS staff marker hierarchy and administrator labels/colors');
 await page.goto('https://msv.test/admin-staff.html');await page.locator('[data-bonus]').first().waitFor();
 const pos=await page.locator('.staff-actions').first().evaluate(el=>{const a=el.children[0].getBoundingClientRect(),b=el.children[1].getBoundingClientRect();return {x:a.x-b.x,width:a.width-b.width,below:b.y>=a.bottom,color:getComputedStyle(el.children[1]).backgroundColor};});assert.equal(pos.x,0);assert.equal(pos.width,0);assert(pos.below);assert.equal(pos.color,'rgba(203, 182, 255, 0.25)');
 await page.locator('tr[data-id="4"] [data-more]').click();assert(await page.locator('[data-more-of="4"] [data-cabinet]').isVisible());await page.screenshot({path:'.tmp/oct05-staff.png'});
 console.log('PASS aligned payroll actions, bonus color and staff cabinet button');
 await page.goto('https://msv.test/admin-residents.html');await page.locator('[data-resident-more]').waitFor();assert.equal(await page.locator('[data-del]').isVisible(),false);assert.doesNotMatch(await page.locator('#rows').innerText(),/без долга|оплачено|внесён/);assert.equal(await page.locator('#rows tr').first().locator('.tag--ok').count(),3);
 await page.locator('[data-resident-more]').click();assert(await page.locator('[data-del]').isVisible());assert.match(await page.locator('.resident-details').innerText(),/Родитель/);assert.equal(await page.locator('[data-del]').evaluate(el=>getComputedStyle(el).fontWeight),'400');await page.screenshot({path:'.tmp/oct05-residents.png'});
 await page.locator('[data-cabinet="10"]').click();await page.waitForURL('**/support.html');await page.locator('.cabinet-preview').waitFor();assert.equal(selected.userId,'10');await page.locator('.cabinet-preview button').click();await page.waitForURL('**/admin-residents.html');assert.equal(viewing,false);
 console.log('PASS resident details, numeric chips and preview/return flow');
 await page.goto('https://msv.test/contracts-preview.html');await page.locator('.contract-group').first().waitFor();assert.equal(await page.locator('.contract-details summary').count(),0);assert.equal(await page.locator('.contract-group').first().locator('.name').filter({hasText:'Шаболовка'}).count(),0);assert.equal(await page.locator('.contract-group').first().locator('summary').evaluate(el=>getComputedStyle(el).listStyleType),'none');await page.locator('[data-detail]').first().click();assert(await page.locator('[data-details]').first().isVisible());await page.screenshot({path:'.tmp/oct05-contracts.png'});
 assert.deepEqual(errors,[]);console.log('PASS compact contractor rows, unified chevrons and no browser errors');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
