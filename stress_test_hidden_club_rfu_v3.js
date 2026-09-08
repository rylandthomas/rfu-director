
'use strict';
const fs=require('fs'),path=require('path');
const YEARS=12,RUNS=50;

const CLUBS=[
 ['Bath',72,7,88,22,6],['Bristol Bears',66,10,94,20,3],['Exeter Chiefs',51,14,66,14,3],
 ['Gloucester',55,13,70,15,2],['Harlequins',64,9,84,18,4],['Leicester Tigers',62,11,80,19,5],
 ['Newcastle Falcons',39,18,62,9,1],['Northampton Saints',73,6,84,23,5],
 ['Sale Sharks',60,10,86,17,3],['Saracens',70,8,94,21,7]
];
const POLICIES=[
 {id:'domestic',label:'Domestic-only England selection',drain:0.72},
 {id:'service',label:'5-year service-based selection',drain:0.92},
 {id:'open',label:'Open England selection',drain:1.25}
];

function rng(seed){return function(){let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function can(c,t,min,m){return c.last[t]==null||m-c.last[t]>=min}
function fresh(){return CLUBS.map(x=>({
 name:x[0],finance:x[1],debt:x[2],owner:x[3],cash:x[4],englandPlayers:x[5],form:50,cool:0,last:{},
 pressureMonths:0,recoveryMonths:0,escalation:0,
 hiddenEvents:0,budget:0,academy:0,cwin:0,closs:0,step:0,invest:0,restructure:0,recruitFreeze:0,commercialRestructure:0,
 activeBudgetMonths:0,activeAcademyMonths:0,activeCommercialLossMonths:0,activeOwnerStepMonths:0,
 retentionSignalMonths:0,pathwaySignalMonths:0,ownershipSignalMonths:0,continuitySignalMonths:0,
 contractReviews:0,overseasMoves:0,playerRiskEvents:0,eligibilityEvents:0,
 rfuApproaches:0,rfuMeetings:0,rfuRetentionMeetings:0,rfuPathwayMeetings:0,rfuGovernanceMeetings:0,rfuContinuityMeetings:0,
 stabilised:0,failed:0,lastRFU:-999,pending:null
}))}

function pressure(c){
 let v=0;
 v+=c.finance<40?28:c.finance<50?18:c.finance<60?8:0;
 v+=c.debt>25?20:c.debt>18?12:c.debt>12?5:0;
 v+=c.cash<0?20:c.cash<4?12:c.cash<8?5:0;
 v+=c.owner<35?20:c.owner<55?10:0;
 return clamp(v,0,100);
}
function signals(c){
 let retention=(c.englandPlayers>=6?18:c.englandPlayers>=4?12:c.englandPlayers>=2?5:0);
 retention+=c.activeBudgetMonths>0?18:0;
 retention+=c.activeCommercialLossMonths>0?7:0;
 retention+=c.activeOwnerStepMonths>0?12:0;
 retention+=c.owner<60?5:0;
 retention+=c.owner<50?7:0;

 let pathway=(c.activeAcademyMonths>0?30:0)+(c.finance<48?7:0)+(c.pressureMonths>=12?6:0);
 let ownership=(c.activeOwnerStepMonths>0?22:0)+(c.owner<50?14:0)+(c.owner<35?14:0);
 let continuity=(c.cash<0?22:c.cash<4?14:c.cash<8?6:0)+(c.debt>28?20:c.debt>20?12:c.debt>14?6:0)+(c.finance<35?24:c.finance<45?14:c.finance<55?7:0)+(c.owner<30?20:c.owner<45?10:0);
 return {retention:clamp(retention,0,100),pathway:clamp(pathway,0,100),ownership:clamp(ownership,0,100),continuity:clamp(continuity,0,100)};
}
function choose(c,p,r,m){
 let a=[];
 if(can(c,'budget',30,m))a.push(['budget',p>=55?22:12]);
 if(can(c,'academy',36,m))a.push(['academy',p>=65?12:5]);
 if(c.debt>15&&can(c,'restructure',30,m))a.push(['restructure',14]);
 if(c.owner>=45&&can(c,'invest',24,m))a.push(['invest',12+c.owner/10]);
 if(c.owner<58&&can(c,'step',36,m))a.push(['step',p>=55?12:6]);
 if(can(c,'commercialRestructure',30,m))a.push(['commercialRestructure',10]);
 if(can(c,'recruitFreeze',24,m))a.push(['recruitFreeze',p>=45?13:7]);
 let total=a.reduce((n,x)=>n+x[1],0);if(!total)return null;let z=r()*total;
 for(const x of a){z-=x[1];if(z<=0)return x[0]}return a[a.length-1][0]
}
function apply(c,t,r,m){
 c.hiddenEvents++;c.last[t]=m;c.cool=2;
 if(t==='budget'){c.budget++;c.activeBudgetMonths=14;c.finance+=.3}
 else if(t==='academy'){c.academy++;c.activeAcademyMonths=22;c.finance+=.15}
 else if(t==='restructure'){c.restructure++;c.debt=Math.max(2,c.debt-(.6+r()*1.8));c.finance+=.4}
 else if(t==='invest'){c.invest++;c.cash+=.6+r()*2.4;c.owner=clamp(c.owner+1,0,100);c.finance+=.5}
 else if(t==='step'){c.step++;c.activeOwnerStepMonths=20;c.owner=clamp(c.owner-(5+r()*10),0,100);c.finance-=.8}
 else if(t==='commercialRestructure'){c.commercialRestructure++;c.finance+=.35}
 else if(t==='recruitFreeze'){c.recruitFreeze++;c.finance+=.2}
}
function decay(c){
 c.activeBudgetMonths=Math.max(0,c.activeBudgetMonths-1);
 c.activeAcademyMonths=Math.max(0,c.activeAcademyMonths-1);
 c.activeCommercialLossMonths=Math.max(0,c.activeCommercialLossMonths-1);
 c.activeOwnerStepMonths=Math.max(0,c.activeOwnerStepMonths-1);
}

function contractCycle(c,policy,r,m){
 if(c.englandPlayers<1)return;
 // Roughly one meaningful review per England player every 2.5-4 years in this accelerated audit.
 let reviews=Math.max(1,Math.round(c.englandPlayers/3));
 if(m%12!==Math.floor(r()*12))return;
 for(let i=0;i<reviews;i++){
  if(r()>.34)continue;
  c.contractReviews++;
  let sc=signals(c);
  let clubPressure=(sc.retention/100)*.45 + (pressure(c)/100)*.25;
  let baseOverseas=.07*policy.drain;
  let moveChance=baseOverseas + clubPressure*.18;
  if(r()<moveChance){
    c.overseasMoves++;
    c.playerRiskEvents++;
    let service=2+Math.floor(r()*9);
    let affected=policy.id==='domestic'||(policy.id==='service'&&service<5);
    if(affected)c.eligibilityEvents++;
  }
 }
}
function maybeRFU(c,r,m){
 let sc=signals(c),type=null;
 if(c.eligibilityEvents>0&&sc.retention>=24)type='retention';
 else if(sc.continuity>=38)type='continuity';
 else if(sc.ownership>=28)type='ownership';
 else if(sc.pathway>=28)type='pathway';

 if(!type||m-c.lastRFU<12)return;
 let chance=type==='retention'?.18:type==='continuity'?.14:.10;
 if(r()>chance)return;

 c.rfuApproaches++;c.rfuMeetings++;c.lastRFU=m;
 if(type==='retention')c.rfuRetentionMeetings++;
 if(type==='pathway')c.rfuPathwayMeetings++;
 if(type==='ownership')c.rfuGovernanceMeetings++;
 if(type==='continuity')c.rfuContinuityMeetings++;

 let before=Math.max(sc.retention,sc.pathway,sc.ownership,sc.continuity);
 if(type==='pathway')c.activeAcademyMonths=Math.max(0,c.activeAcademyMonths-8);
 else if(type==='ownership')c.owner=clamp(c.owner+1+r()*2,0,100);
 else if(type==='continuity'){c.cash+=.5+r()*.8;c.finance+=.4}
 // Retention meeting deliberately does not guarantee player stays.
 c.pending={month:m+12,before};
}
function follow(c,m){
 if(!c.pending||m<c.pending.month)return;
 let sc=signals(c),now=Math.max(sc.retention,sc.pathway,sc.ownership,sc.continuity);
 if(now<=c.pending.before-8)c.stabilised++;else c.failed++;
 c.pending=null;
}

function simulate(seed,policy){
 let r=rng(seed),cs=fresh(),lastPath=-999,lastRet=-999,systemicPath=0,systemicRet=0;
 for(let m=0;m<YEARS*12;m++){
  for(const c of cs){
   decay(c);
   if(c.cool>0)c.cool--;
   let p=pressure(c);
   if(p>=35){c.pressureMonths++;c.recoveryMonths=0}else{c.recoveryMonths++;c.pressureMonths=Math.max(0,c.pressureMonths-1)}
   if(c.pressureMonths>0&&c.pressureMonths%18===0)c.escalation=Math.min(4,c.escalation+1);
   if(c.recoveryMonths>0&&c.recoveryMonths%12===0)c.escalation=Math.max(0,c.escalation-1);

   if(c.cool===0&&p>=30){
    let chance=Math.min(.13,.022+p*.0009+c.escalation*.012);
    if(r()<chance){let t=choose(c,p,r,m);if(t)apply(c,t,r,m)}
   }
   if(c.cool===0){
    let roll=r();
    if(roll<.018&&can(c,'cwin',18,m)){c.cwin++;c.hiddenEvents++;c.last.cwin=m;c.cool=2;c.finance+=.7}
    else if(roll<.032&&can(c,'closs',18,m)){c.closs++;c.hiddenEvents++;c.last.closs=m;c.cool=2;c.finance-=.7;c.activeCommercialLossMonths=16}
    else if(roll<.040&&c.owner>65&&can(c,'invest',24,m))apply(c,'invest',r,m);
   }

   let sc=signals(c);
   if(sc.retention>=24)c.retentionSignalMonths++;
   if(sc.pathway>=28)c.pathwaySignalMonths++;
   if(sc.ownership>=28)c.ownershipSignalMonths++;
   if(sc.continuity>=38)c.continuitySignalMonths++;

   contractCycle(c,policy,r,m);
   maybeRFU(c,r,m);
   follow(c,m);

   c.finance=clamp(c.finance+(r()-.52)*.09,20,95);
   c.cash=clamp(c.cash+(r()-.54)*.07,-10,35);
  }

  let pathCount=cs.filter(c=>signals(c).pathway>=28).length;
  let retCount=cs.filter(c=>signals(c).retention>=24).length;
  let policyWeight=policy.id==='open'?2:policy.id==='service'?1:0;

  if(pathCount>=3&&m-lastPath>=12){systemicPath++;lastPath=m}
  if(retCount+policyWeight>=5&&m-lastRet>=12){systemicRet++;lastRet=m}
 }
 return {clubs:cs,systemicPath,systemicRet};
}

function summarize(policy,index){
 let runs=[];for(let i=0;i<RUNS;i++)runs.push(simulate(41000+index*1000+i,policy));
 let rows=CLUBS.map(x=>{
  let a=runs.map(run=>run.clubs.find(c=>c.name===x[0])),avg=k=>a.reduce((n,c)=>n+c[k],0)/a.length,pct=k=>a.filter(c=>c[k]>0).length/a.length*100;
  return {
   Policy:policy.label,Club:x[0],'Hidden events':+avg('hiddenEvents').toFixed(1),
   'Retention signal months':+avg('retentionSignalMonths').toFixed(1),'Pathway signal months':+avg('pathwaySignalMonths').toFixed(1),
   'Ownership signal months':+avg('ownershipSignalMonths').toFixed(1),'Continuity signal months':+avg('continuitySignalMonths').toFixed(1),
   'Contract reviews':+avg('contractReviews').toFixed(1),'Overseas moves':+avg('overseasMoves').toFixed(2),
   'Eligibility events':+avg('eligibilityEvents').toFixed(2),'RFU approaches':+avg('rfuApproaches').toFixed(2),
   'RFU retention meetings':+avg('rfuRetentionMeetings').toFixed(2),'RFU pathway meetings':+avg('rfuPathwayMeetings').toFixed(2),
   'RFU governance meetings':+avg('rfuGovernanceMeetings').toFixed(2),'RFU continuity meetings':+avg('rfuContinuityMeetings').toFixed(2),
   'Contact %':+pct('rfuApproaches').toFixed(1),'Stabilised':+avg('stabilised').toFixed(2),'Failed':+avg('failed').toFixed(2)
  };
 });
 return {
  policy:policy.label,rows,
  systemicPath:+(runs.reduce((n,x)=>n+x.systemicPath,0)/RUNS).toFixed(2),
  systemicRet:+(runs.reduce((n,x)=>n+x.systemicRet,0)/RUNS).toFixed(2)
 };
}

console.log('HIDDEN CLUB + RFU RELEVANCE STRESS TEST V3.1');
console.log(`50 fresh runs × ${YEARS} years per selection policy`);
console.log('Contract/transfer cycles are deliberately accelerated for developer auditing only.\n');

let summaries=POLICIES.map(summarize),all=[];
for(const sm of summaries){
 console.log(`\n${sm.policy.toUpperCase()}`);console.log('='.repeat(sm.policy.length));
 console.table(sm.rows.map(r=>({
  Club:r.Club,'Hidden events':r['Hidden events'],'Retention months':r['Retention signal months'],
  'Pathway months':r['Pathway signal months'],'Ownership months':r['Ownership signal months'],
  'Contract reviews':r['Contract reviews'],'Overseas moves':r['Overseas moves'],'Eligibility events':r['Eligibility events'],
  'RFU approaches':r['RFU approaches'],'Retention mtgs':r['RFU retention meetings'],
  'Pathway mtgs':r['RFU pathway meetings'],'Governance mtgs':r['RFU governance meetings'],
  'Contact %':r['Contact %']
 })));
 console.log(`Systemic pathway events/run: ${sm.systemicPath}`);
 console.log(`Systemic retention events/run: ${sm.systemicRet}`);
 all.push(...sm.rows);
}
console.log('\nPOLICY / RFU IMPACT SUMMARY');console.log('===========================');
console.table(summaries.map(sm=>{
 let rows=sm.rows,sum=k=>rows.reduce((n,r)=>n+r[k],0);
 return {Policy:sm.policy,'Overseas moves / 12y':+sum('Overseas moves').toFixed(1),
 'Eligibility events / 12y':+sum('Eligibility events').toFixed(1),'RFU approaches / 12y':+sum('RFU approaches').toFixed(1),
 'Retention meetings':+sum('RFU retention meetings').toFixed(1),'Pathway meetings':+sum('RFU pathway meetings').toFixed(1),
 'Governance meetings':+sum('RFU governance meetings').toFixed(1),'Systemic pathway':sm.systemicPath,'Systemic retention':sm.systemicRet};
}));
function csv(rows){let h=Object.keys(rows[0]),esc=v=>/[",\n]/.test(String(v))?`"${String(v).replace(/"/g,'""')}"`:String(v);return h.join(',')+'\n'+rows.map(r=>h.map(k=>esc(r[k])).join(',')).join('\n')}
fs.writeFileSync(path.join(__dirname,'hidden_club_rfu_v31_audit.csv'),csv(all),'utf8');
console.log('\nSaved hidden_club_rfu_v31_audit.csv');
console.log('\nWHAT TO SEND BACK');
console.log('Paste all three policy tables and POLICY / RFU IMPACT SUMMARY.');
