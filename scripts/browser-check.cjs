const { spawn } = require('node:child_process');
const path = require('node:path');
const browser = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', ['--headless','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=9337',`--user-data-dir=${path.resolve('.browser-test-profile')}`,'about:blank'], {stdio:'ignore',windowsHide:true});
const delay = ms => new Promise(r=>setTimeout(r,ms));
(async()=>{
 let tabs;
 for(let i=0;i<40;i++){try{tabs=await(await fetch('http://127.0.0.1:9337/json')).json();break;}catch{await delay(250);}}
 if(!tabs)throw new Error('Browser did not start');
 const ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise(r=>ws.onopen=r);
 let id=0; const pending=new Map(); const errors=[];
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){pending.get(m.id)?.(m.result);pending.delete(m.id);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);};
 const send=(method,params={})=>new Promise(r=>{const key=++id;pending.set(key,r);ws.send(JSON.stringify({id:key,method,params}));});
 await send('Runtime.enable');
 for(const url of ['http://localhost:3000','file:///'+path.resolve('index.html').replaceAll('\\','/')]){
  errors.length=0;await send('Page.navigate',{url});await delay(1800);
  await send('Page.bringToFront');
  await send('Emulation.setFocusEmulationEnabled',{enabled:true});
  const result=await send('Runtime.evaluate',{expression:`JSON.stringify({cards:document.querySelectorAll('.course-card').length, title:document.title})`,returnByValue:true});
  console.log(url,result.result?.value,JSON.stringify(errors));
  const hoverCheck=await send('Runtime.evaluate',{expression:`(() => {
   const style=document.createElement('style');style.textContent='.course-card{transition:none!important}';document.head.append(style);
   const card=id=>document.querySelector('[data-course-id="'+id+'"]');
   const assert=(ok,message)=>{if(!ok)throw new Error(message)};
   const physics=card('Physics'),calculus=card('Calculus-1');
   physics.dispatchEvent(new PointerEvent('pointerover',{bubbles:true,pointerType:'mouse'}));
   assert(['prereq','immediate','coreq'].every(c=>calculus.classList.contains(c)),'Physics overlap');
   assert(getComputedStyle(calculus).backgroundColor==='rgb(196, 191, 192)','Immediate precedence');
   assert(getComputedStyle(physics).backgroundColor==='rgb(0, 0, 0)','Selected color');
   assert(getComputedStyle(physics.querySelector('.course-meta')).color==='rgb(255, 255, 255)','Selected text');
   document.querySelector('#board').dispatchEvent(new PointerEvent('pointerleave'));
   assert(!document.querySelector('.prereq,.coreq,.postreq,.hover-selected'),'Hover cleanup');
   card('ECE20002').focus();
   assert(card('MA261').classList.contains('prereq'),'Concurrent prerequisite chain');
   assert(card('MA266').classList.contains('coreq'),'Keyboard preview');
   card('ECE20002').blur();
   assert(!document.querySelector('.prereq,.coreq,.postreq,.hover-selected'),'Focus cleanup');
   card('ECE20002').click();
   assert(document.querySelector('#details').open,'Click details');
   document.querySelector('#details').close();
   return 'Hover, keyboard, colors, cleanup and details passed';
  })()`,returnByValue:true});
  if(hoverCheck.exceptionDetails)throw new Error(JSON.stringify(hoverCheck.exceptionDetails));
  if(errors.length)throw new Error(JSON.stringify(errors));
  console.log(hoverCheck.result?.value);
 }
 await send('Browser.close');ws.close();
})().catch(e=>{console.error(e);browser.kill();process.exitCode=1;});

