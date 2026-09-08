
'use strict';

const YEARS=12,RUNS=50;
const PLAYERS=[
 ['Ellis Gengey','Bristol Bears',31,'First Choice',72,'Good','Fit'],
 ['Jamie Georgson','Saracens',35,'Key Player',105,'Stable','Fit'],
 ['Will Stuartson','Bath',30,'Squad',48,'Good','Fit'],
 ['Maro Itoga','Saracens',31,'Key Player',95,'Excellent','Fit'],
 ['Ollie Chesham','Leicester Tigers',25,'First Choice',31,'Good','Fit'],
 ['Tom Currey','Sale Sharks',31,'First Choice',57,'Good','Fit'],
 ['Ben Earll','Saracens',28,'Key Player',43,'Excellent','Fit'],
 ['Alex Dombrant','Harlequins',29,'Squad',23,'Average','Fit'],
 ['Alex Mitchells','Northampton Saints',29,'First Choice',33,'Excellent','Fit'],
 ['Markus Smyth','Harlequins',27,'First Choice',42,'Excellent','Fit'],
 ['Fin Smithson','Northampton Saints',24,'Squad',14,'Good','Fit'],
 ['Fraser Dingwall','Northampton Saints',27,'Squad',8,'Good','Fit'],
 ['Ollie Lawrencey','Bath',26,'First Choice',34,'Good','Fit'],
 ['Henry Slayde','Exeter Chiefs',33,'Squad',72,'Average','Minor concern'],
 ['Tommy Freemann','Northampton Saints',25,'First Choice',19,'Excellent','Fit'],
 ['Immanuel Faye-Waboso','Exeter Chiefs',23,'Squad',12,'Good','Returning'],
 ['Freddie Stewardson','Leicester Tigers',25,'Squad',38,'Stable','Fit']
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
function formScore(v){return v==='Excellent'?90:v==='Good'?78:v==='Stable'?66:v==='Average'?56:42}
function fitScore(v){return v==='Fit'?75:v==='Returning'?62:v==='Minor concern'?54:35}
function profile(name,status,age){let seed=[...name].reduce((n,ch)=>n+ch.charCodeAt(0),0),f=m=>40+((seed*m)%51);return{money:f(3),england:f(5)+(status==='Key Player'?10:status==='First Choice'?6:0),loyalty:f(7),security:f(11)+(age>=30?8:0),overseas:f(17)}}
function band(p){let b=imp(p.status)*.72+Math.min(18,p.caps*.12)+(p.age>=29?3:0);return b>=88?'elite':b>=72?'senior':b>=57?'established':'squad'}
function market(p){let age=p.age<=24?8:p.age<=28?12:p.age<=31?7:p.age<=33?1:-8,caps=Math.min(18,p.caps*.16),status=p.status==='Key Player'?18:p.status==='First Choice'?12:4;return clamp(Math.round(formScore(p.form)*.45+status+caps+age),10,100)}
function affordability(p){let c=p.clubState;return clamp(Math.round(65+(c.finance-60)*.45+(c.owner-65)*.22+c.wage*.65+c.retention*.65+c.commercial*.18-Math.max(0,p.priority-75)*.08),5,95)}
function intent(p){return clamp(Math.round(p.priority+(p.age>=34?-20:p.age>=31?-8:0)+(p.clubState.finance<55?-4:4)),5,98)}
function pressure(p){let a=affordability(p),i=intent(p);return clamp(Math.round((100-a)*.55+(100-i)*.20+(p.band==='elite'?10:p.band==='senior'?5:0)),0,100)}
function contractYears(p,r){if(p.age>=34)return r()<.72?1:2;if(p.age>=31)return r()<.62?2:1;if(p.age<=24)return 3+Math.floor(r()*2);return 2+Math.floor(r()*3)}
function failureReason(p,a,it,stay,r){
 let reasons=[];
 if(a<40)reasons.push(['club_affordability',28+(40-a)]);
 if(it<45)reasons.push(['club_release',26+(45-it)]);
 if(stay<58)reasons.push(['player_rejects_terms',24+(58-stay)]);
 if(p.decision.security>72&&p.age>=29)reasons.push(['security_gap',20+(p.decision.security-72)*.6]);
 if(p.overseasInterest>55)reasons.push(['overseas_interest',18+(p.overseasInterest-55)*.7]);
 if(p.domesticInterest>60)reasons.push(['domestic_interest',14+(p.domesticInterest-60)*.6]);
 if(market(p)<42&&p.age>=31)reasons.push(['age_profile',18+(42-market(p))*.4]);
 if(!reasons.length)reasons.push(['terms_not_agreed',20]);
 let total=reasons.reduce((n,x)=>n+x[1],0),z=r()*total;
 for(const x of reasons){z-=x[1];if(z<=0)return x[0]}return reasons[reasons.length-1][0]
}
function fresh(seed){
 let r=rng(seed),clubs=JSON.parse(JSON.stringify(CLUBS));
 let players=PLAYERS.map((x,i)=>{
  let p={name:x[0],club:x[1],age:x[2],status:x[3],caps:x[4],form:x[5],fitness:x[6]},yrs=2+((i*7+p.age)%3);
  return {...p,priority:imp(p.status),band:band(p),decision:profile(p.name,p.status,p.age),
   clubState:clubs[p.club],months:yrs*12,milestones:{},pressureRecorded:false,failureRecorded:false,
   reviewLockedUntil:0,reviews:0,renewals:0,failures:0,pressureCases:0,
   overseasInterest:0,domesticInterest:0,failureReasons:{}};
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
   p.months--;
   let a=affordability(p),it=intent(p),pr=pressure(p),mk=market(p),status=p.status==='Key Player'?18:p.status==='First Choice'?10:0;
   p.overseasInterest=clamp(Math.round(mk*.38+status+p.decision.overseas*.20+(100-a)*.22+(p.months<=12?8:0)-(p.age>=34?9:0)),0,100);
   p.domesticInterest=clamp(Math.round(mk*.34+status*.75+(100-a)*.16+(p.months<=12?6:0)-(p.age>=34?6:0)),0,100);

   if(m>=p.reviewLockedUntil){
    for(const milestone of [12,9,6,3]){
      if(p.months<=milestone&&p.months>milestone-3&&!p.milestones[milestone]){
        p.milestones[milestone]=true;p.reviews++;
        let offer=a*.60+it*.40;
        let stay=p.decision.loyalty*.18+p.decision.england*.18+offer*.32+p.decision.security*.10+formScore(p.form)*.10+fitScore(p.fitness)*.05+(100-p.overseasInterest)*.07;
        let urgency=milestone<=6?6:milestone<=9?3:0;
        let chance=.18+urgency*.015+(a-50)*.006+(it-50)*.004+(stay-60)*.007-Math.max(0,p.overseasInterest-55)*.004-Math.max(0,p.domesticInterest-65)*.002;
        chance=clamp(chance,.04,.88);

        if(r()<chance&&a>=34&&it>=40){
          p.renewals++;
          p.months=contractYears(p,r)*12;
          p.milestones={};p.pressureRecorded=false;p.failureRecorded=false;
          p.reviewLockedUntil=m+Math.max(1,p.months-12);
          break;
        }
        if(pr>=32&&!p.pressureRecorded){p.pressureCases++;p.pressureRecorded=true}
      }
    }
   }

   if(p.months<0&&!p.failureRecorded){
    let offer=a*.60+it*.40;
    let stay=p.decision.loyalty*.18+p.decision.england*.18+offer*.32+p.decision.security*.10+formScore(p.form)*.10+fitScore(p.fitness)*.05+(100-p.overseasInterest)*.07;
    let reason=failureReason(p,a,it,stay,r);
    p.failures++;p.failureRecorded=true;p.failureReasons[reason]=(p.failureReasons[reason]||0)+1;
    // Keep unresolved but only count once.
    p.months=0;
   }

   if(m>0&&m%12===0)p.age++;
  }
 }
 return players;
}

let runs=[];for(let i=0;i<RUNS;i++)runs.push(simulate(61000+i));
let out=PLAYERS.map(x=>{
 let a=runs.map(r=>r.find(p=>p.name===x[0])),avg=k=>a.reduce((n,p)=>n+p[k],0)/a.length,pct=k=>a.filter(p=>p[k]>0).length/a.length*100;
 return {Player:x[0],Club:x[1],Band:a[0].band,'Avg reviews':+avg('reviews').toFixed(1),'Avg renewals':+avg('renewals').toFixed(2),
 'Failed renewals':+avg('failures').toFixed(2),'Runs with failure %':+pct('failures').toFixed(1),
 'Pressure cases':+avg('pressureCases').toFixed(2),'Domestic interest':+avg('domesticInterest').toFixed(1),'Overseas interest':+avg('overseasInterest').toFixed(1)};
});
let reasons={};
runs.forEach(run=>run.forEach(p=>Object.entries(p.failureReasons).forEach(([k,v])=>reasons[k]=(reasons[k]||0)+v)));
Object.keys(reasons).forEach(k=>reasons[k]=+(reasons[k]/RUNS).toFixed(2));

console.log('HIDDEN CLUB CONTRACT STRESS TEST V1.2');
console.log(`50 fresh runs × ${YEARS} years`);
console.log('No transfers yet. Failed renewals are counted once and held unresolved for the movement engine.\n');
console.table(out);
console.log('\nSUMMARY');console.log('=======');
console.table([{
 'Reviews / run':+out.reduce((n,x)=>n+x['Avg reviews'],0).toFixed(1),
 'Renewals / run':+out.reduce((n,x)=>n+x['Avg renewals'],0).toFixed(1),
 'Failed renewals / run':+out.reduce((n,x)=>n+x['Failed renewals'],0).toFixed(1),
 'Retention-pressure cases / run':+out.reduce((n,x)=>n+x['Pressure cases'],0).toFixed(1)
}]);
console.log('\nFAILURE REASONS — AVERAGE PER 12-YEAR RUN');
console.log('==========================================');
console.table(Object.entries(reasons).map(([Reason,Average])=>({Reason,Average})));
