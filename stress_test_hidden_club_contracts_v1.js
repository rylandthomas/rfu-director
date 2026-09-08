
'use strict';
const YEARS=12,RUNS=50;
const PLAYERS=[
 ['Ellis Gengey','Bristol Bears',31,'First Choice',72],['Jamie Georgson','Saracens',35,'Key Player',105],
 ['Will Stuartson','Bath',30,'Squad',48],['Maro Itoga','Saracens',31,'Key Player',95],
 ['Ollie Chesham','Leicester Tigers',25,'First Choice',31],['Tom Currey','Sale Sharks',31,'First Choice',57],
 ['Ben Earll','Saracens',28,'Key Player',43],['Alex Dombrant','Harlequins',29,'Squad',23],
 ['Alex Mitchells','Northampton Saints',29,'First Choice',33],['Markus Smyth','Harlequins',27,'First Choice',42],
 ['Fin Smithson','Northampton Saints',24,'Squad',14],['Fraser Dingwall','Northampton Saints',27,'Squad',8],
 ['Ollie Lawrencey','Bath',26,'First Choice',34],['Henry Slayde','Exeter Chiefs',33,'Squad',72],
 ['Tommy Freemann','Northampton Saints',25,'First Choice',19],['Immanuel Faye-Waboso','Exeter Chiefs',23,'Squad',12],
 ['Freddie Stewardson','Leicester Tigers',25,'Squad',38]
];
const CLUBS={
 'Bath':{finance:72,owner:88,wage:0,retention:0,commercial:0},
 'Bristol Bears':{finance:66,owner:94,wage:0,retention:0,commercial:0},
 'Exeter Chiefs':{finance:51,owner:66,wage:0,retention:0,commercial:0},
 'Harlequins':{finance:64,owner:84,wage:0,retention:0,commercial:0},
 'Leicester Tigers':{finance:62,owner:80,wage:0,retention:0,commercial:0},
 'Northampton Saints':{finance:73,owner:84,wage:0,retention:0,commercial:0},
 'Sale Sharks':{finance:60,owner:86,wage:0,retention:0,commercial:0},
 'Saracens':{finance:70,owner:94,wage:0,retention:0,commercial:0}
};
function rng(seed){return function(){let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function imp(s){return s==='Key Player'?92:s==='First Choice'?78:58}
function band(p){let b=imp(p.status)*.72+Math.min(18,p.caps*.12)+(p.age>=29?3:0);return b>=88?'elite':b>=72?'senior':b>=57?'established':'squad'}
function profile(name,status,age){let seed=[...name].reduce((n,ch)=>n+ch.charCodeAt(0),0),f=m=>40+((seed*m)%51);return{money:f(3),england:f(5)+(status==='Key Player'?10:status==='First Choice'?6:0),loyalty:f(7),security:f(11)+(age>=30?8:0),overseas:f(17)}}
function affordability(p){
 let c=p.clubState;
 return clamp(Math.round(65+(c.finance-60)*.45+(c.owner-65)*.22+c.wage*.65+c.retention*.65+c.commercial*.18-Math.max(0,p.priority-75)*.08),5,95)
}
function intent(p){return clamp(Math.round(p.priority+(p.age>=34?-20:p.age>=31?-8:0)+(p.clubState.finance<55?-4:4)),5,98)}
function pressure(p){let a=affordability(p),i=intent(p);return clamp(Math.round((100-a)*.55+(100-i)*.20+(p.band==='elite'?10:p.band==='senior'?5:0)),0,100)}
function resetCycle(p,r){
 p.milestones={};p.pressureRecorded=false;p.failureRecorded=false;p.unresolved=false;
 p.months=(p.age>=32?(1+Math.floor(r()*2)):(2+Math.floor(r()*3)))*12;
}
function fresh(seed){
 let r=rng(seed),clubs=JSON.parse(JSON.stringify(CLUBS));
 let players=PLAYERS.map((x,i)=>{
  let p={name:x[0],club:x[1],age:x[2],status:x[3],caps:x[4]},yrs=2+((i*7+p.age)%3);
  return {...p,priority:imp(p.status),band:band(p),decision:profile(p.name,p.status,p.age),months:yrs*12,
   clubState:clubs[p.club],milestones:{},pressureRecorded:false,failureRecorded:false,unresolved:false,
   reviews:0,renewals:0,failures:0,pressureCases:0,domesticInterest:0,overseasInterest:0};
 });
 return {r,clubs,players};
}
function simulate(seed){
 let {r,clubs,players}=fresh(seed);
 for(let m=0;m<YEARS*12;m++){
  for(const c of Object.values(clubs)){
   if(r()<.008)c.wage=clamp(c.wage-8,-25,15);
   if(r()<.008)c.retention=clamp(c.retention-8,-25,15);
   if(r()<.012)c.commercial=clamp(c.commercial+(r()<.5?-6:6),-20,20);
   c.wage*=.985;c.retention*=.985;c.commercial*=.99;
   c.finance=clamp(c.finance+(r()-.52)*.10,35,90);
  }
  for(const p of players){
   if(!p.unresolved)p.months--;
   let a=affordability(p),it=intent(p),pr=pressure(p);
   p.overseasInterest=clamp(Math.round((100-a)*.40+(p.status==='Key Player'?18:p.status==='First Choice'?10:0)+p.decision.overseas*.22),0,100);
   p.domesticInterest=clamp(Math.round(p.priority*.35+(p.status==='Key Player'?18:p.status==='First Choice'?10:0)+(100-a)*.18),0,100);

   if(!p.unresolved){
    for(const milestone of [12,9,6,3]){
      if(p.months<=milestone&&p.months>milestone-3&&!p.milestones[milestone]){
        p.milestones[milestone]=true;p.reviews++;
        let offer=a*.65+it*.35,stay=p.decision.loyalty*.24+p.decision.england*.22+offer*.44+p.decision.security*.10;
        let urgency=milestone<=6?7:milestone<=9?3:0,threshold=68+(p.band==='elite'?5:0)-urgency;
        if(stay>=threshold&&a>=42&&it>=52){p.renewals++;resetCycle(p,r);break}
        if(pr>=32&&!p.pressureRecorded){p.pressureCases++;p.pressureRecorded=true}
      }
    }
    if(p.months<0&&!p.failureRecorded){p.failures++;p.failureRecorded=true;p.unresolved=true}
   }
   if(m>0&&m%12===0)p.age++;
  }
 }
 return players;
}
let runs=[];for(let i=0;i<RUNS;i++)runs.push(simulate(52000+i));
let out=PLAYERS.map(x=>{
 let a=runs.map(r=>r.find(p=>p.name===x[0])),avg=k=>a.reduce((n,p)=>n+p[k],0)/a.length,pct=k=>a.filter(p=>p[k]>0).length/a.length*100;
 return {Player:x[0],Club:x[1],Band:a[0].band,'Avg reviews':+avg('reviews').toFixed(1),'Avg renewals':+avg('renewals').toFixed(2),
 'Failed renewals':+avg('failures').toFixed(2),'Runs with failure %':+pct('failures').toFixed(1),'Pressure cases':+avg('pressureCases').toFixed(2),
 'Domestic interest':+avg('domesticInterest').toFixed(1),'Overseas interest':+avg('overseasInterest').toFixed(1)};
});
console.log('HIDDEN CLUB CONTRACT STRESS TEST V1.1');
console.log(`50 fresh runs × ${YEARS} years`);
console.log('No transfers yet: an expired unresolved contract is counted once and then held for the movement engine.\n');
console.table(out);
console.log('\nSUMMARY');console.log('=======');
console.table([{
 'Reviews / run':+out.reduce((n,x)=>n+x['Avg reviews'],0).toFixed(1),
 'Renewals / run':+out.reduce((n,x)=>n+x['Avg renewals'],0).toFixed(1),
 'Failed renewals / run':+out.reduce((n,x)=>n+x['Failed renewals'],0).toFixed(1),
 'Retention-pressure cases / run':+out.reduce((n,x)=>n+x['Pressure cases'],0).toFixed(1)
}]);
