
'use strict';
const RUNS=50,YEARS=25;
const POLICIES=[
 {id:'domestic',label:'Domestic only',serviceYears:5,capExempt:false},
 {id:'caps50',label:'Domestic + 50 caps',serviceYears:5,capExempt:true},
 {id:'service',label:'5-year service',serviceYears:5,capExempt:false},
 {id:'open',label:'Open selection',serviceYears:5,capExempt:false}
];
const BASE=[
 ['Seb Attkinson',24,'First Choice',4,7],['Finn Baxster',24,'Squad',4,18],['Ollie Chesham',25,'First Choice',6,38],
 ['Alex Coales',26,'First Choice',6,22],['Luke Cowen-Dickey',33,'First Choice',12,61],['Tom Currey',28,'Key Player',9,71],
 ['Ben Earll',28,'Key Player',8,54],['Immanuel Faye-Waboso',23,'First Choice',3,16],['George Forde',33,'First Choice',13,108],
 ['Tommy Freemann',25,'Key Player',5,30],['George Furbenk',29,'First Choice',7,14],['Ellis Gengey',31,'Key Player',11,83],
 ['Jamie Georgson',35,'Key Player',14,113],['Joe Hayes',27,'First Choice',7,25],['Maro Itoga',31,'Key Player',12,102],
 ['George Martyn',25,'Squad',6,24],['Alex Mitchells',29,'Key Player',7,32],['Asher Opoku-Fordjer',22,'Squad',2,8],
 ['Guy Peppar',23,'First Choice',3,15],['Henry Pollok',21,'First Choice',2,13],['Henry Slayde',33,'Squad',11,77],
 ['Fin Smithson',24,'Key Player',4,19],['Markus Smyth',27,'Key Player',7,53],['Will Stuartson',30,'Squad',9,53],
 ['Jack van Portfleet',25,'First Choice',5,27]
];
function rng(seed){return function(){let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function years(age,r){if(age>=34)return r()<.72?1:2;if(age>=31)return r()<.62?2:1;if(age<=24)return 3+Math.floor(r()*2);return 2+Math.floor(r()*3)}
function retire(age,status,r){if(age<31)return false;let c=age===31?.015:age===32?.035:age===33?.08:age===34?.15:age===35?.28:age===36?.46:age===37?.68:.88;if(status==='Key Player')c*=.72;return r()<c}
function prospect(r,id){let status=r()<.14?'First Choice':'Squad',age=20+Math.floor(r()*4);return{name:'Prospect '+id,age,status,service:0,caps:0,location:'england',months:years(age,r)*12,retired:false,generation:2,yearsAbroad:0}}
function weight(p){
 let status=p.status==='Key Player'?1.42:p.status==='First Choice'?1.20:1;
 let age=p.age<=23?1.34:p.age<=26?1.28:p.age<=29?1.22:p.age<=31?1.08:p.age<=33?.82:.56;
 let caps=1+Math.min(.32,p.caps/250),persist=1+Math.min(.30,(p.yearsAbroad||0)*.06),gen=p.generation===2?1.06:1;
 return status*age*caps*persist*gen;
}
function band(p){return p.age<=24?'young':p.age<=29?'prime':p.age<=32?'senior':'veteran'}
function sim(seed,policy){
 let r=rng(seed),seq=0,ps=BASE.map(x=>({name:x[0],age:x[1],status:x[2],service:x[3],caps:x[4],location:'england',months:years(x[1],r)*12,retired:false,generation:1,yearsAbroad:0}));
 let T={maxCurrent:0,maxStructural:0,avgCurrent:0,avgStructural:0,seriousSeasons:0,emergingSeasons:0,young:0,prime:0,senior:0,veteran:0,gen2:0,seasons:0};
 let structural=0;
 for(let m=0;m<YEARS*12;m++){
  for(const p of ps.filter(x=>!x.retired)){
   p.months--;
   if(m%12===0&&p.status!=='Squad'&&r()<.70)p.caps+=1+Math.floor(r()*4);
   if(p.months<=12&&p.months>=0&&r()<.11){
    let c=clamp(.58+(p.status==='Key Player'?.1:0)-(p.age>=34?.16:0),.18,.84);
    if(r()<c){p.months=years(p.age,r)*12;continue}
   }
   if(p.months<0){
    if(retire(p.age,p.status,r)){p.retired=true;ps.push(prospect(r,++seq));continue}
    let imp=p.status==='Key Player'?3:p.status==='First Choice'?2:1;
    let exempt=policy.capExempt&&p.caps>=50;
    let deterrent=exempt?0:(policy.id==='domestic'||policy.id==='caps50'?22:policy.id==='service'?7:0);
    let abroad=28+r()*32+(p.age<=29?7:0);
    if(abroad-deterrent*(imp/3)>32+r()*32){p.location='overseas';p.yearsAbroad=1}else{p.location='england';p.yearsAbroad=0}
    p.months=years(p.age,r)*12;
   }
  }
  if(m>0&&m%12===0){
   T.seasons++;
   for(const p of ps.filter(x=>!x.retired)){
    p.age++;
    if(p.location==='england'){p.service++;p.yearsAbroad=0}
    else{
     p.yearsAbroad++;
     if(r()<.10+((policy.id==='domestic'||policy.id==='caps50')?.12:0)+(p.age>=30?.06:0)){p.location='england';p.yearsAbroad=0;p.months=years(p.age,r)*12}
    }
    if(retire(p.age,p.status,r)){p.retired=true;ps.push(prospect(r,++seq))}
   }
   let abroad=ps.filter(x=>!x.retired&&x.location==='overseas');
   let raw=abroad.reduce((n,p)=>n+weight(p),0),current=clamp(raw*5.3,0,100);
   let alpha=current>=structural?.24:.14; structural=clamp(structural*(1-alpha)+current*alpha,0,100);
   T.avgCurrent+=current;T.avgStructural+=structural;T.maxCurrent=Math.max(T.maxCurrent,current);T.maxStructural=Math.max(T.maxStructural,structural);
   if(structural>=58||current>=72)T.seriousSeasons++;else if(structural>=34||current>=48)T.emergingSeasons++;
   abroad.forEach(p=>{T[band(p)]+=weight(p);if(p.generation===2)T.gen2+=weight(p)});
  }
 }
 ['avgCurrent','avgStructural','young','prime','senior','veteran','gen2'].forEach(k=>T[k]/=Math.max(1,T.seasons));
 return T;
}
function avg(a,k){return a.reduce((n,x)=>n+x[k],0)/a.length}
let table=[];
for(let pi=0;pi<POLICIES.length;pi++){
 let runs=[];for(let i=0;i<RUNS;i++)runs.push(sim(150000+pi*1000+i,POLICIES[pi]));
 table.push({
  Policy:POLICIES[pi].label,
  'Avg Current Drain':+avg(runs,'avgCurrent').toFixed(1),
  'Avg Structural Drain':+avg(runs,'avgStructural').toFixed(1),
  'Max Current':+avg(runs,'maxCurrent').toFixed(1),
  'Max Structural':+avg(runs,'maxStructural').toFixed(1),
  'Emerging seasons':+avg(runs,'emergingSeasons').toFixed(1),
  'Serious seasons':+avg(runs,'seriousSeasons').toFixed(1),
  'Young contribution':+avg(runs,'young').toFixed(2),
  'Prime contribution':+avg(runs,'prime').toFixed(2),
  'Senior contribution':+avg(runs,'senior').toFixed(2),
  'Veteran contribution':+avg(runs,'veteran').toFixed(2),
  'Generated contribution':+avg(runs,'gen2').toFixed(2)
 });
}
console.log('PLAYER DRAIN INDEX STRESS TEST V1.6');
console.log('50 fresh runs × 25 years per England selection policy');
console.log('Current Drain measures the present overseas player loss; Structural Drain measures persistent long-term pressure.\n');
console.table(table);
