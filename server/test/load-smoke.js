'use strict';
// Local HTTP/rate-limit diagnostic only. No production data, database or outbound notifications.
process.env.SESSION_SECRET='local-load-smoke-not-a-real-secret';
process.env.DATABASE_URL='postgres://invalid:invalid@127.0.0.1:1/msv_load_smoke';
process.env.DEMO_MODE='0';
process.env.WEB_DIR='../web';
const http=require('http');
const {performance}=require('perf_hooks');
const {server}=require('../index');
const count=Number(process.argv[2]||500);
if(![50,500].includes(count))throw Error('Use 50 or 500');
const timeout=setTimeout(()=>process.exit(2),15000);
server.listen(0,'127.0.0.1',async()=>{
 const port=server.address().port,begin=performance.now(),times=[],statuses={};
 const agent=new http.Agent({keepAlive:true,maxSockets:50});
 await Promise.all(Array.from({length:count},()=>new Promise(resolve=>{
  const start=performance.now();
  const req=http.get({host:'127.0.0.1',port,path:'/residences.html',agent},res=>{
   res.resume();res.on('end',()=>{times.push(performance.now()-start);statuses[res.statusCode]=(statuses[res.statusCode]||0)+1;resolve();});
  });req.on('error',()=>{statuses.networkError=(statuses.networkError||0)+1;resolve();});
 })));
 times.sort((a,b)=>a-b);
 console.log(JSON.stringify({scope:'Local Node HTTP + shared-IP limiter; no DB/payment/registration/notification load',requests:count,maxConcurrentConnections:50,statuses,elapsedMs:Math.round(performance.now()-begin),p95Ms:Math.round(times[Math.ceil(times.length*.95)-1])},null,2));
 agent.destroy();clearTimeout(timeout);server.close(()=>process.exit(0));
});

