'use strict';
const assert=require('node:assert/strict'),rules=require('./lib/vendor-contracts'),weekdays=require('./lib/vendor-reminders').isWorkingDay;
const c={name:'Интернет',group:'Шаболовка',status:'Действует',amount:100,frequency:5,until:'2026-10-12',reminderValue:1,reminderUnit:'workdays'};
assert.equal(rules.remindAt(c,weekdays),'2026-10-09');assert.equal(rules.remindAt({...c,reminderValue:2},weekdays),'2026-10-08');assert.equal(rules.remindAt({...c,reminderValue:2,reminderUnit:'weeks'},weekdays),'2026-09-28');assert.equal(rules.remindAt({...c,reminderValue:null},weekdays),null);
assert.equal(rules.validate(c).frequency,5);assert.throws(()=>rules.validate({...c,until:''}));assert.throws(()=>rules.validate({...c,reminderValue:-1}));assert.throws(()=>rules.validate({...c,amount:1.001}));
assert.equal(rules.payment({start:'2026-10-17',months:3,sum:12345.67,paid:'2026-10-05'}).end,'2027-01-17');assert.throws(()=>rules.payment({start:'2026-02-30',months:1,sum:1,paid:'2026-10-05'}));
console.log('PASS contract validation, arbitrary periods, weekdays/week reminders');
