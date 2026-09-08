
'use strict';

const YEARS=15,RUNS=50;
const POLICIES=[
 {id:'domestic',label:'Domestic only',serviceYears:5},
 {id:'service',label:'5-year service',serviceYears:5},
 {id:'open',label:'Open selection',serviceYears:5}
];
const BASE=[
 ['Seb Attkinson','Gloucester Rugby',24,'First Choice',7],['Finn Baxster','Harlequins',24,'Squad',18],
 ['Ollie Chesham','Leicester Tigers',25,'First Choice',38],['Alex Coales','Northampton Saints',26,'First Choice',22],
 ['Luke Cowen-Dickey','Sale Sharks',33,'First Choice',61],['Tom Currey','Sale Sharks',28,'Key Player',71],
 ['Ben Earll','Saracens',28,'Key Player',54],['Immanuel Faye-Waboso','Exeter Chiefs',23,'First Choice',16],
 ['George Forde','Sale Sharks',33,'First Choice',108],['Tommy Freemann','Northampton Saints',25,'Key Player',30],
 ['George Furbenk','Harlequins',29,'First Choice',14],['Ellis Gengey','Bristol Bears',31,'Key Player',83],
 ['Jamie Georgson','Saracens',35,'Key Player',113],['Joe Hayes','Leicester Tigers',27,'First Choice',25],
 ['Maro Itoga','Saracens',31,'Key Player',102],['George Martyn','Saracens',25,'Squad',24],
 ['Alex Mitchells','Northampton Saints',29,'Key Player',32],['Asher Opoku-Fordjer','Sale Sharks',22,'Squad',8],
 ['Guy Peppar','Bath Rugby',23,'First Choice',15],['Henry Pollok','Northampton Saints',21,'First Choice',13],
 ['Henry Slayde','Exeter Chiefs',33,'Squad',77],['Fin Smithson','Northampton Saints',24,'Key Player',19],
 ['Markus Smyth','Harlequins',27,'Key Player',53],['Will Stuartson','Bath Rugby',30,'Squad',53],
 ['Jack van Portfleet','Leicester Tigers',25,'First Choice',27]
];
function rng(seed){return function(){let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function importance(s){return s==='Key Player'?92:s==='First Choice'?78:58}
function retirement(age,status,r){
 if(age<31)return false;
 let c=age===31?.015:age===32?.035:age===33?.08:age===34?.15:age===35?.28:age===36?.46:age===37?.68:.88;
 if(status==='Key Player')c*=.72;
 return r()<c;
}
function contractYears(age,r){if(age>=34)return r()<.72?1:2;if(age>=31)return r()<.62?2:1;if(age<=24)return 3+Math.floor(r()*2);return 2+Math.floor(r()*3)}
function simulate(seed,policy){
 let r=rng(seed);
 let players=BASE.map((x,i)=>({name:x[0],club:x[1],age:x[2],status:x[3],caps:x[4],service:Math.max(1,x[2]-18),
  months:(2+((i*7+x[2])%3))*12,renewals:0,domesticMoves:0,overseasMoves:0,eligibilityEvents:0,retired:false,replacements:0}));
 let totals={renewals:0,failed:0,domesticMoves:0,overseasMoves:0,eligibilityEvents:0,retirements:0,replacements:0,bridgeDeals:0};

 for(let m=0;m<YEARS*12;m++){
  for(const p of players.filter(x=>!x.retired)){
   p.months--;
   let imp=importance(p.status);
   let clubPressure=clamp((p.club==='Exeter Chiefs'?20:p.club==='Sale Sharks'?10:p.club==='Bristol Bears'?6:2)+(r()-.5)*16,0,45);
   let overseasInterest=clamp(imp*.35+clubPressure*.8+(p.age<=29?8:0)+r()*20,0,100);
   let domesticInterest=clamp(imp*.38+clubPressure*.45+r()*20,0,100);

   if(p.months<=12&&p.months>=0&&r()<.12){
    let renewalChance=clamp(.55-clubPressure*.008+(p.status==='Key Player'?.12:p.status==='First Choice'?.05:0)-(p.age>=34?.15:0),.12,.86);
    if(r()<renewalChance){
      p.renewals++;totals.renewals++;p.months=contractYears(p.age,r)*12;
      continue;
    }
   }
   if(p.months<0){
    totals.failed++;
    if(retirement(p.age,p.status,r)*1.3){p.retired=true;totals.retirements++;totals.replacements++;continue}

    let englandAmbition=p.status==='Key Player'?.85:p.status==='First Choice'?.70:.48;
    let deterrent=policy.id==='domestic'?22:policy.id==='service'?7:0;
    let domesticScore=domesticInterest*.7+r()*25;
    let overseasScore=overseasInterest*.72+r()*28-deterrent*englandAmbition;
    let bridge=18+r()*22;

    if(domesticScore>=overseasScore&&domesticScore>=bridge){
      p.domesticMoves++;totals.domesticMoves++;p.club='Other English club';p.months=contractYears(p.age,r)*12;
    }else if(overseasScore>=bridge){
      p.overseasMoves++;totals.overseasMoves++;p.club='Overseas club';p.months=contractYears(p.age,r)*12;
      let eligible=policy.id==='open'||(policy.id==='service'&&p.service>=policy.serviceYears);
      if(!eligible){p.eligibilityEvents++;totals.eligibilityEvents++}
    }else{
      totals.bridgeDeals++;p.months=12;
    }
   }
  }
  if(m>0&&m%12===0){
   players.filter(x=>!x.retired).forEach(p=>{p.age++;if(!p.club.includes('Overseas'))p.service++;if(retirement(p.age,p.status,r)){p.retired=true;totals.retirements++;totals.replacements++}});
  }
 }
 return totals;
}
function avg(rows,k){return rows.reduce((n,x)=>n+x[k],0)/rows.length}
let summary=[];
for(let pi=0;pi<POLICIES.length;pi++){
 let policy=POLICIES[pi],runs=[];
 for(let i=0;i<RUNS;i++)runs.push(simulate(70000+pi*1000+i,policy));
 summary.push({
  Policy:policy.label,
  'Renewals / 15y':+avg(runs,'renewals').toFixed(1),
  'Failed cycles / 15y':+avg(runs,'failed').toFixed(1),
  'Domestic moves / 15y':+avg(runs,'domesticMoves').toFixed(1),
  'Overseas moves / 15y':+avg(runs,'overseasMoves').toFixed(1),
  'Eligibility events / 15y':+avg(runs,'eligibilityEvents').toFixed(1),
  'Retirements / 15y':+avg(runs,'retirements').toFixed(1),
  'Generated replacements':+avg(runs,'replacements').toFixed(1),
  'Bridge deals':+avg(runs,'bridgeDeals').toFixed(1)
 });
}
console.log('HIDDEN CLUB CONTRACT + CAREER + MOVEMENT STRESS TEST V1.3');
console.log('50 fresh runs × 15 years per England selection policy');
console.log('The starting pool is based on the current 2026/27 enhanced England cohort, using altered in-game player names.\n');
console.table(summary);
console.log('\nExpected relationship: restrictive policy suppresses overseas moves but creates more eligibility consequences when they occur; open selection removes individual eligibility events but permits more overseas movement.');
