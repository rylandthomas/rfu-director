
'use strict';
const RUNS=50,YEARS=30;
const SCENARIOS=[
 {name:'Domestic + normal investment',policy:'domestic',grass:1,path:1,infra:1,pro:1},
 {name:'Open + normal investment',policy:'open',grass:1,path:1,infra:1,pro:1},
 {name:'Open + strong investment',policy:'open',grass:1.25,path:1.25,infra:1.20,pro:1.10},
 {name:'Open + low investment',policy:'open',grass:.72,path:.78,infra:.82,pro:.90},
 {name:'Open + zero investment',policy:'open',grass:0,path:0,infra:0,pro:.70},
 {name:'Domestic + zero investment',policy:'domestic',grass:0,path:0,infra:0,pro:.70}
];
function rng(seed){return function(){let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function clamp(v,a=5,b=95){return Math.max(a,Math.min(b,v))}
function lag(arr,a,b,fallback){let v=[];for(let i=a;i<=b;i++){let j=arr.length-1-i;if(j>=0)v.push(arr[j])}return v.length?v.reduce((x,y)=>x+y,0)/v.length:fallback}
function push(hist,k,v,max){if(!hist[k])hist[k]=[];hist[k].push(v);hist[k]=hist[k].slice(-max)}
function drainTarget(policy,year,r){
 let base=policy==='open'?27:9;
 let maturation=Math.min(1,year/8);
 return Math.max(0,base*maturation+(r()-.5)*(policy==='open'?12:7));
}
function simulate(seed,sc){
 let r=rng(seed);
 let e={pro:72,path:72,grass:74,infra:70,pressure:28,depth:72,production:70,commercial:70,opp:50,structural:0,h:{}};
 let checkpoints={};
 for(let y=1;y<=YEARS;y++){
  let current=drainTarget(sc.policy,y,r);
  let a=current>=e.structural?.24:.14;e.structural=clamp(e.structural*(1-a)+current*a,0,100);

  push(e.h,'grassInv',sc.grass,15);push(e.h,'pathInv',sc.path,12);push(e.h,'infraInv',sc.infra,15);push(e.h,'proInv',sc.pro,8);

  let gLag=lag(e.h.grassInv,2,5,1),iLag=lag(e.h.infraInv,2,6,1);
  e.grass=clamp(e.grass+(gLag-1)*1.65+(iLag-1)*.65-(e.pressure-30)*.008);

  e.infra=clamp(e.infra+(sc.infra-1)*.85+(sc.pro-1)*.20-(e.pressure-35)*.004);

  let pLag=lag(e.h.pathInv,1,4,1);
  e.path=clamp(e.path+(pLag-1)*1.55+(e.grass-70)*.025-(e.pressure-30)*.012);

  let oppTarget=50+Math.min(12,current*.22)-Math.max(0,e.structural-42)*.28;
  e.opp=clamp(e.opp*.72+oppTarget*.28);

  let wageRelief=Math.min(1.8,current*.025),qualityPenalty=current*.055+e.structural*.085;
  e.pro=clamp(e.pro+(sc.pro-1)*2.0+wageRelief-qualityPenalty*.22+(e.commercial-70)*.018);

  e.commercial=clamp(e.commercial+(e.pro-70)*.020-e.structural*.024+(sc.pro-1)*.85);

  let pressureTarget=28+Math.max(0,68-e.pro)*.42+Math.max(0,68-e.commercial)*.32+Math.max(0,e.structural-25)*.18-(sc.pro-1)*8;
  e.pressure=clamp(e.pressure*.70+pressureTarget*.30,5,90);

  push(e.h,'grassHealth',e.grass,15);push(e.h,'pathHealth',e.path,12);push(e.h,'infraHealth',e.infra,15);
  let gLegacy=lag(e.h.grassHealth,5,9,e.grass),pLegacy=lag(e.h.pathHealth,3,6,e.path),iLegacy=lag(e.h.infraHealth,5,10,e.infra);
  let target=gLegacy*.33+pLegacy*.44+iLegacy*.18+e.opp*.05;
  e.production=clamp(e.production*.78+target*.22);

  push(e.h,'production',e.production,10);
  let prodLegacy=lag(e.h.production,3,6,e.production),availabilityPenalty=Math.max(0,current/5.3-5)*.7;
  let depthTarget=prodLegacy*.82+e.path*.18-availabilityPenalty;
  e.depth=clamp(e.depth*.82+depthTarget*.18);

  if([5,10,20,30].includes(y))checkpoints[y]={pro:e.pro,path:e.path,grass:e.grass,infra:e.infra,pressure:e.pressure,production:e.production,depth:e.depth,commercial:e.commercial,structural:e.structural};
 }
 return checkpoints;
}
function avg(arr,key){return arr.reduce((n,x)=>n+x[key],0)/arr.length}
function summarise(cp,year){
 let rows=cp.map(x=>x[year]);
 return {
  Pro:+avg(rows,'pro').toFixed(1),Path:+avg(rows,'path').toFixed(1),Grass:+avg(rows,'grass').toFixed(1),
  Infra:+avg(rows,'infra').toFixed(1),Pressure:+avg(rows,'pressure').toFixed(1),
  Production:+avg(rows,'production').toFixed(1),EnglandDepth:+avg(rows,'depth').toFixed(1),
  Commercial:+avg(rows,'commercial').toFixed(1),Drain:+avg(rows,'structural').toFixed(1)
 };
}
let results=[];
for(let si=0;si<SCENARIOS.length;si++){
 let runs=[];for(let i=0;i<RUNS;i++)runs.push(simulate(200000+si*1000+i,SCENARIOS[si]));
 for(const year of [5,10,20,30])results.push({Scenario:SCENARIOS[si].name,Year:year,...summarise(runs,year)});
}
console.log('ENGLISH RUGBY ECOSYSTEM STRESS TEST V1.7.1');
console.log('50 fresh runs × 30 years per scenario');
console.log('Health scores are hidden developer metrics only. 70≈healthy baseline; <50 indicates material weakness; <30 indicates severe long-term damage.\n');
console.table(results);
