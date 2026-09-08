
'use strict';
const clubs=[
 ['Bath',72,7,88],['Bristol Bears',66,10,94],['Exeter Chiefs',51,14,66],['Gloucester',55,13,70],['Harlequins',64,9,84],['Leicester Tigers',62,11,80],['Newcastle Falcons',39,18,62],['Northampton Saints',73,6,84],['Sale Sharks',60,10,86],['Saracens',70,8,94]
];
function rng(seed){return function(){let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function run(seed,years=12){
 let r=rng(seed),cs=clubs.map(x=>({name:x[0],finance:x[1],debt:x[2],owner:x[3],cool:0,events:0,budget:0,academy:0,cwin:0,closs:0,step:0,invest:0}));
 for(let m=0;m<years*12;m++)for(const c of cs){
  if(c.cool>0){c.cool--;continue}
  let roll=r();
  if(c.owner<45&&roll<.08){c.step++;c.events++;c.cool=2}
  else if(c.finance<48&&roll<.12){c.budget++;c.events++;c.cool=2}
  else if(c.finance<52&&c.debt>16&&roll<.08){c.academy++;c.events++;c.cool=2}
  else if(roll<.025){c.cwin++;c.events++;c.finance=clamp(c.finance+1,20,95);c.cool=2}
  else if(roll<.045){c.closs++;c.events++;c.finance=clamp(c.finance-1,20,95);c.cool=2}
  else if(roll<.055){c.invest++;c.events++;c.owner=clamp(c.owner+3,0,100);c.cool=2}
  c.finance=clamp(c.finance+(r()-.52)*.08,20,95);
 }
 return cs;
}
let runs=[];for(let i=0;i<50;i++)runs.push(run(9000+i));
let out=clubs.map(x=>{let a=runs.map(r=>r.find(c=>c.name===x[0])),avg=k=>a.reduce((n,c)=>n+c[k],0)/a.length;return{Club:x[0],'Hidden events':+avg('events').toFixed(1),'Budget cuts':+avg('budget').toFixed(1),'Academy cuts':+avg('academy').toFixed(1),'Commercial gains':+avg('cwin').toFixed(1),'Commercial losses':+avg('closs').toFixed(1),'Owner step-backs':+avg('step').toFixed(1),'Owner investments':+avg('invest').toFixed(1)}}); 
console.log('HIDDEN CLUB EVENT AUDIT — 50 RUNS × 12 YEARS');console.log('================================================');console.table(out);
