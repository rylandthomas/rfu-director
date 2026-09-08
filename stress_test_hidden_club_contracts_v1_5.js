
'use strict';
const RUNS=50,YEARS=20;
const POLICIES=[
 {id:'domestic',label:'Domestic only',serviceYears:5,capExempt:false,capThreshold:50},
 {id:'caps50',label:'Domestic + 50-cap exemption',serviceYears:5,capExempt:true,capThreshold:50},
 {id:'service',label:'5-year service',serviceYears:5,capExempt:false,capThreshold:50},
 {id:'open',label:'Open selection',serviceYears:5,capExempt:false,capThreshold:50}
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
function prospect(r,id){let status=r()<.16?'First Choice':'Squad',age=20+Math.floor(r()*4);return{name:'Prospect '+id,age,status,service:0,caps:0,location:'england',months:years(age,r)*12,retired:false,generation:2}}
function sim(seed,policy){
 let r=rng(seed),seq=0,ps=BASE.map(x=>({name:x[0],age:x[1],status:x[2],service:x[3],caps:x[4],location:'england',months:years(x[1],r)*12,retired:false,generation:1}));
 let T={overseas:0,returns:0,eligibility:0,capSaved:0,retirements:0,generated:0,maxAbroad:0,abroadSum:0,seasons:0,young:0,late:0};
 for(let m=0;m<YEARS*12;m++){
  for(const p of ps.filter(x=>!x.retired)){
   p.months--;
   if(m%12===0 && p.status!=='Squad' && r()<.72)p.caps+=1+Math.floor(r()*5);
   if(p.months<=12&&p.months>=0&&r()<.11){let c=clamp(.58+(p.status==='Key Player'?.1:0)-(p.age>=34?.16:0),.18,.84);if(r()<c){p.months=years(p.age,r)*12;continue}}
   if(p.months<0){
    if(retire(p.age,p.status,r)){p.retired=true;T.retirements++;ps.push(prospect(r,++seq));T.generated++;continue}
    let imp=p.status==='Key Player'?3:p.status==='First Choice'?2:1;
    let exempt=policy.capExempt&&p.caps>=policy.capThreshold;
    let deterrent=exempt?0:(policy.id==='domestic'||policy.id==='caps50'?22:policy.id==='service'?7:0);
    let abroad=28+r()*32+(p.age<=29?7:0);
    if(abroad-deterrent*(imp/3)>32+r()*32){
     p.location='overseas';T.overseas++;if(p.age<=27)T.young++;if(p.age>=31)T.late++;
     let eligible=policy.id==='open'||exempt||(policy.id==='service'&&p.service>=policy.serviceYears);
     if(!eligible)T.eligibility++; else if(exempt)T.capSaved++;
    } else p.location='england';
    p.months=years(p.age,r)*12;
   }
  }
  if(m>0&&m%12===0){
   T.seasons++;
   for(const p of ps.filter(x=>!x.retired)){
    p.age++;if(p.location==='england')p.service++;
    else if(r()<.10+((policy.id==='domestic'||policy.id==='caps50')?.12:0)+(p.age>=30?.06:0)){p.location='england';p.months=years(p.age,r)*12;T.returns++}
    if(retire(p.age,p.status,r)){p.retired=true;T.retirements++;ps.push(prospect(r,++seq));T.generated++}
   }
   let a=ps.filter(x=>!x.retired&&x.location==='overseas');T.maxAbroad=Math.max(T.maxAbroad,a.length);T.abroadSum+=a.length;
  }
 }
 T.avgAbroad=T.abroadSum/Math.max(1,T.seasons);return T;
}
function avg(a,k){return a.reduce((n,x)=>n+x[k],0)/a.length}
let table=[];
for(let pi=0;pi<POLICIES.length;pi++){let a=[];for(let i=0;i<RUNS;i++)a.push(sim(120000+pi*1000+i,POLICIES[pi]));table.push({
 Policy:POLICIES[pi].label,'Overseas moves':+avg(a,'overseas').toFixed(1),'Returns':+avg(a,'returns').toFixed(1),
 'Eligibility events':+avg(a,'eligibility').toFixed(1),'Saved by 50 caps':+avg(a,'capSaved').toFixed(1),
 'Avg abroad':+avg(a,'avgAbroad').toFixed(1),'Max abroad':+avg(a,'maxAbroad').toFixed(1),
 'Young overseas':+avg(a,'young').toFixed(1),'Late-career overseas':+avg(a,'late').toFixed(1)
})}
console.log('HIDDEN CLUB CONTRACT + 50-CAP EXEMPTION STRESS TEST V1.5');
console.log('50 fresh runs × 20 years per policy');
console.log('50-cap exemption is an optional in-game RFU policy, not asserted as the current real-world RFU rule.\n');
console.table(table);
