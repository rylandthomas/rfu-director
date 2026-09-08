
'use strict';

const CLUBS=[
 ['Bath',72,7,88,22],['Bristol Bears',66,10,94,20],['Exeter Chiefs',51,14,66,14],['Gloucester',55,13,70,15],
 ['Harlequins',64,9,84,18],['Leicester Tigers',62,11,80,19],['Newcastle Falcons',39,18,62,9],
 ['Northampton Saints',73,6,84,23],['Sale Sharks',60,10,86,17],['Saracens',70,8,94,21]
];
function rng(seed){return function(){let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function fresh(){
 return CLUBS.map(x=>({name:x[0],finance:x[1],debt:x[2],owner:x[3],cash:x[4],form:50,cool:0,pressureMonths:0,recoveryMonths:0,escalation:0,last:{},
 events:0,budget:0,academy:0,academyReinvest:0,cwin:0,closs:0,step:0,invest:0,restructure:0,recruitFreeze:0,commercialRestructure:0}));
}
function monthsSince(c,type,m){return c.last[type]==null?999:m-c.last[type]}
function can(c,type,min,m){return monthsSince(c,type,m)>=min}
function score(c){
 let v=0;v+=c.finance<40?28:c.finance<50?18:c.finance<60?8:0;
 v+=c.debt>25?20:c.debt>18?12:c.debt>12?5:0;
 v+=c.cash<0?20:c.cash<4?12:c.cash<8?5:0;
 v+=c.owner<35?20:c.owner<55?10:0;return clamp(v,0,100)
}
function choose(c,p,r,m){
 let a=[];
 if(can(c,'budget',24,m))a.push(['budget',p>=55?22:12]);
 if(can(c,'academy',36,m))a.push(['academy',p>=65?12:5]);
 if(c.debt>15&&can(c,'restructure',30,m))a.push(['restructure',14]);
 if(c.owner>=45&&can(c,'invest',24,m))a.push(['invest',12+c.owner/10]);
 if(c.owner<55&&can(c,'step',36,m))a.push(['step',p>=60?14:7]);
 if(can(c,'commercialRestructure',24,m))a.push(['commercialRestructure',10]);
 if(can(c,'recruitFreeze',18,m))a.push(['recruitFreeze',p>=45?13:7]);
 let total=a.reduce((n,x)=>n+x[1],0);if(!total)return null;let z=r()*total;
 for(const x of a){z-=x[1];if(z<=0)return x[0]}return a[a.length-1][0]
}
function apply(c,t,r,m){
 c.events++;c.last[t]=m;c.cool=2;
 if(t==='budget'){c.budget++;c.finance+=.3}
 else if(t==='academy'){c.academy++;c.finance+=.15}
 else if(t==='restructure'){c.restructure++;c.debt=Math.max(2,c.debt-(.6+r()*1.8));c.finance+=.4}
 else if(t==='invest'){c.invest++;c.cash+=.6+r()*2.4;c.owner=clamp(c.owner+1,0,100);c.finance+=.5}
 else if(t==='step'){c.step++;c.owner=clamp(c.owner-(5+r()*10),0,100);c.finance-=.8}
 else if(t==='commercialRestructure'){c.commercialRestructure++;c.finance+=.35}
 else if(t==='recruitFreeze'){c.recruitFreeze++;c.finance+=.2}
}
function simulate(seed,years=12){
 let r=rng(seed),cs=fresh();
 for(let m=0;m<years*12;m++){
  for(const c of cs){
   if(c.cool>0)c.cool--;
   let p=score(c);
   if(p>=35){c.pressureMonths++;c.recoveryMonths=0}else{c.recoveryMonths++;c.pressureMonths=Math.max(0,c.pressureMonths-1)}
   if(c.pressureMonths>0&&c.pressureMonths%18===0)c.escalation=Math.min(4,c.escalation+1);
   if(c.recoveryMonths>0&&c.recoveryMonths%12===0)c.escalation=Math.max(0,c.escalation-1);

   if(c.cool===0&&p>=30){
    let chance=Math.min(.20,.035+p*.0014+c.escalation*.018);
    if(r()<chance){let t=choose(c,p,r,m);if(t){apply(c,t,r,m);continue}}
   }
   if(c.cool===0){
    let roll=r();
    if(roll<.018&&can(c,'cwin',18,m)){c.cwin++;c.events++;c.last.cwin=m;c.cool=2;c.finance+=.7}
    else if(roll<.032&&can(c,'closs',18,m)){c.closs++;c.events++;c.last.closs=m;c.cool=2;c.finance-=.7}
    else if(roll<.040&&c.owner>65&&can(c,'invest',24,m)){apply(c,'invest',r,m)}
    else if(p<22&&c.recoveryMonths>=10&&roll<.060&&can(c,'academyReinvest',30,m)){c.academyReinvest++;c.events++;c.last.academyReinvest=m;c.cool=2;c.finance+=.25}
   }

   // Slow world drift.
   c.finance=clamp(c.finance+(r()-.52)*.10,20,95);
   c.cash=clamp(c.cash+(r()-.54)*.08,-10,35);
  }
 }
 return cs;
}
let runs=[];for(let i=0;i<50;i++)runs.push(simulate(12000+i));
let out=CLUBS.map(x=>{let a=runs.map(r=>r.find(c=>c.name===x[0])),avg=k=>a.reduce((n,c)=>n+c[k],0)/a.length;
 return {Club:x[0],'Hidden events':+avg('events').toFixed(1),'Budget cuts':+avg('budget').toFixed(1),'Academy cuts':+avg('academy').toFixed(1),
 'Academy reinvest':+avg('academyReinvest').toFixed(1),'Commercial gains':+avg('cwin').toFixed(1),'Commercial losses':+avg('closs').toFixed(1),
 'Owner step-backs':+avg('step').toFixed(1),'Owner investments':+avg('invest').toFixed(1),'Debt restructures':+avg('restructure').toFixed(1),
 'Recruitment freezes':+avg('recruitFreeze').toFixed(1),'Commercial restructures':+avg('commercialRestructure').toFixed(1)}});
console.log('HIDDEN CLUB EVENT AUDIT V2 — 50 RUNS × 12 YEARS');
console.log('===================================================');
console.table(out);
