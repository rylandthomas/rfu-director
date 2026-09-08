const REGIONS=[
["North East",46,48,50,45,68,.90],["North West",60,57,59,58,72,1.20],["Yorkshire",66,59,63,64,78,1.25],
["East Midlands",69,64,67,69,76,1.15],["West Midlands",55,54,57,53,73,1.05],["East",51,58,55,52,75,1.00],
["London",61,49,65,66,92,1.50],["South East",59,58,61,60,82,1.30],["South Central",62,62,63,62,79,1.10],["South West",78,64,72,73,84,1.25]];
const TYPES={
 facilities:{cap:6,run:.45,delivery:2,peak:4,decay:.82,legacy:.12,e:{fac:13,part:4}},
 schools:{cap:1.8,run:.75,delivery:1,peak:4,decay:.70,legacy:.06,e:{part:10,coach:3}},
 coaching:{cap:1,run:.9,delivery:1,peak:3,decay:.62,legacy:.05,e:{coach:12,path:4}},
 centre:{cap:7.5,run:.8,delivery:2,peak:5,decay:.84,legacy:.14,e:{fac:7,path:13,coach:4}},
 talent:{cap:.8,run:.7,delivery:1,peak:3,decay:.58,legacy:.03,e:{path:10}}
};
const clamp=x=>Math.max(0,Math.min(100,x));
function make(){return{year:2026,regions:REGIONS.map(x=>{let c=[];for(let born=2016;born<=2025;born++){let st=x[1]*.30+x[3]*.24+x[4]*.28+x[2]*.08+x[5]*.10;c.push({str:st,pro:born+7,eng:born+10})}return{name:x[0],struct:{part:x[1],fac:x[2],coach:x[3],path:x[4]},part:x[1],fac:x[2],coach:x[3],path:x[4],pot:x[5],need:x[6],fund:x[6],cohorts:c}}),projects:[],u18:{q:70,fund:3.75,need:3.75},u20:{q:72,fund:5.95,need:5.95},spend:0}}
function effect(p,y){let t=TYPES[p.type],a=y-p.start;if(a<t.delivery)return(a+1)/t.delivery*.2;let m=a-t.delivery;if(m<=t.peak)return .45+.55*m/t.peak;let decay=p.maint?Math.min(.96,t.decay+.10):t.decay;return Math.max(t.legacy,Math.pow(decay,m-t.peak))}
function add(s,ri,type,maint=true){s.projects.push({ri,type,start:s.year,maint});s.spend+=TYPES[type].cap}
function recalc(s){
 s.regions.forEach((r,i)=>{let b={part:0,fac:0,coach:0,path:0};s.projects.filter(p=>p.ri===i).forEach(p=>{let m=effect(p,s.year);Object.entries(TYPES[p.type].e).forEach(([k,v])=>b[k]+=v*m)});for(let k of ["part","fac","coach","path"])r[k]=clamp(r.struct[k]+b[k])});
 let avg=k=>s.regions.reduce((a,r)=>a+r[k],0)/s.regions.length,grass=avg("part")*.55+avg("coach")*.25+avg("fac")*.20,infra=avg("fac"),path=avg("path")*.82+s.u18.q*.08+s.u20.q*.10;
 let pro=s.regions.flatMap(r=>r.cohorts).filter(c=>c.pro<=s.year&&c.pro>s.year-5),proRaw=pro.length?pro.reduce((a,c)=>a+c.str,0)/pro.length:grass,prod=proRaw*.85+path*.15;
 let eng=s.regions.flatMap(r=>r.cohorts).filter(c=>c.eng<=s.year&&c.eng>s.year-5),raw=eng.length?eng.reduce((a,c)=>a+c.str,0)/eng.length:proRaw,depth=clamp(raw+(s.u18.q-60)*.06+(s.u20.q-60)*.10);
 return{grass,infra,path,prod,depth}
}
function advance(s){
 let n=recalc(s);s.regions.forEach(r=>{r.cohorts.push({str:clamp(r.part*.30+r.coach*.24+r.path*.28+r.fac*.08+r.pot*.10),pro:s.year+7,eng:s.year+10});let ratio=r.need?r.fund/r.need:0;r.struct.part=clamp(r.struct.part+(ratio-1)*.95-.05);r.struct.fac=clamp(r.struct.fac+(ratio-1)*1.75-.12);r.struct.coach=clamp(r.struct.coach+(ratio-1)*1.35-.08);r.struct.path=clamp(r.struct.path+(ratio-1)*1.20-.06)});
 for(let p of [s.u18,s.u20]){let ratio=p.need?p.fund/p.need:0;p.q=clamp(p.q+(ratio-1)*2-.08)}
 let annual=s.regions.reduce((a,r)=>a+r.fund,0)+s.u18.fund+s.u20.fund+s.projects.filter(p=>p.maint).reduce((a,p)=>a+TYPES[p.type].run,0);s.spend+=annual;s.year++;return n
}
const scenarios=[
 {name:"Balanced sustained",setup:(s,y)=>{s.regions.forEach(r=>r.fund=r.need*1.10);s.u18.fund=s.u18.need*1.10;s.u20.fund=s.u20.need*1.10;if([2026,2034,2042,2050].includes(y))s.regions.forEach((r,i)=>{add(s,i,"facilities",true);add(s,i,"coaching",true);add(s,i,"schools",true);if(i%2===0)add(s,i,"centre",true);else add(s,i,"talent",true)})}},
 {name:"One-off boom then stop",setup:(s,y)=>{s.regions.forEach(r=>r.fund=r.need*.60);if(y===2026)s.regions.forEach((r,i)=>{add(s,i,"facilities",false);add(s,i,"schools",false);add(s,i,"centre",false)})}},
 {name:"Pathway only",setup:(s,y)=>{s.regions.forEach(r=>r.fund=r.need*.55);s.u18.fund=s.u18.need*1.15;s.u20.fund=s.u20.need*1.15;if([2026,2032,2038,2044].includes(y))s.regions.forEach((r,i)=>{add(s,i,"talent",true);add(s,i,"coaching",true)})}},
 {name:"Infrastructure only",setup:(s,y)=>{s.regions.forEach(r=>r.fund=r.need*.75);if([2026,2036,2046].includes(y))s.regions.forEach((r,i)=>add(s,i,"facilities",true))}},
 {name:"Regional concentration",setup:(s,y)=>{if([2026,2033,2040,2047].includes(y))[2,3,6,9].forEach(i=>{add(s,i,"facilities",true);add(s,i,"coaching",true);add(s,i,"centre",true)})}},
 {name:"Neglect",setup:(s,y)=>{s.regions.forEach(r=>r.fund=0);s.u18.fund=0;s.u20.fund=0}}
];
let rows=[];
for(const sc of scenarios){let s=make();for(let i=0;i<30;i++){sc.setup(s,s.year);let n=advance(s);if([5,10,20,30].includes(i+1))rows.push({Scenario:sc.name,Year:i+1,Grass:+n.grass.toFixed(1),Infra:+n.infra.toFixed(1),Path:+n.path.toFixed(1),Production:+n.prod.toFixed(1),EnglandDepth:+n.depth.toFixed(1),Spend:+s.spend.toFixed(1)})}}
console.log("RFU DIRECTOR — DEVELOPMENT NETWORK STRESS TEST V1.8.1");
console.log("Core funding is required to preserve the inherited system. Player-production and England-depth effects are cohort-lagged.");
console.table(rows);