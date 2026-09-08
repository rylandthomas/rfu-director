const REGIONS=[
["North East",46,48,50,45,68],["North West",60,57,59,58,72],["Yorkshire",66,59,63,64,78],
["East Midlands",69,64,67,69,76],["West Midlands",55,54,57,53,73],["East",51,58,55,52,75],
["London",61,49,65,66,92],["South East",59,58,61,60,82],["South Central",62,62,63,62,79],["South West",78,64,72,73,84]];
const TYPES={
 facilities:{cap:6,run:.45,delivery:2,peak:4,decay:.82,legacy:.12,e:{fac:13,part:4}},
 schools:{cap:1.8,run:.75,delivery:1,peak:4,decay:.70,legacy:.06,e:{part:10,coach:3}},
 coaching:{cap:1,run:.9,delivery:1,peak:3,decay:.62,legacy:.05,e:{coach:12,path:4}},
 centre:{cap:7.5,run:.8,delivery:2,peak:5,decay:.84,legacy:.14,e:{fac:7,path:13,coach:4}},
 talent:{cap:.8,run:.7,delivery:1,peak:3,decay:.58,legacy:.03,e:{path:10}}
};
const clamp=x=>Math.max(0,Math.min(100,x));
function effect(p,y){let t=TYPES[p.type],a=y-p.start;if(a<t.delivery)return(a+1)/t.delivery*.2;let m=a-t.delivery;if(m<=t.peak)return .45+.55*m/t.peak;let decay=p.maint?Math.min(.96,t.decay+.10):t.decay;return Math.max(t.legacy,Math.pow(decay,m-t.peak))}
function make(){return{year:2026,regions:REGIONS.map(x=>({name:x[0],base:{part:x[1],fac:x[2],coach:x[3],path:x[4],pot:x[5]},part:x[1],fac:x[2],coach:x[3],path:x[4],pot:x[5],cohorts:[]})),projects:[],u18:70,u20:72,spend:0}}
function add(s,ri,type,maint=true){s.projects.push({ri,type,start:s.year,maint});s.spend+=TYPES[type].cap}
function recalc(s){
 s.regions.forEach((r,i)=>{let b={part:0,fac:0,coach:0,path:0};s.projects.filter(p=>p.ri===i).forEach(p=>{let m=effect(p,s.year);Object.entries(TYPES[p.type].e).forEach(([k,v])=>b[k]+=v*m)});let wear=Math.min(8,(s.year-2026)*.16);r.part=clamp(r.base.part-wear*.35+b.part);r.fac=clamp(r.base.fac-wear+b.fac);r.coach=clamp(r.base.coach-wear*.55+b.coach);r.path=clamp(r.base.path-wear*.45+b.path)});
 let avg=k=>s.regions.reduce((a,r)=>a+r[k],0)/s.regions.length;
 let grass=avg("part")*.55+avg("coach")*.25+avg("fac")*.20, infra=avg("fac"), path=avg("path")*.72+s.u18*.10+s.u20*.18;
 let matured=s.regions.flatMap(r=>r.cohorts).filter(c=>c.pro<=s.year&&c.pro>s.year-5), cs=matured.length?matured.reduce((a,c)=>a+c.str,0)/matured.length:grass;
 let prod=cs*.62+path*.38, depth=prod*.58+s.u18*.15+s.u20*.27;
 return {grass,infra,path,prod,depth}
}
function advance(s){
 let n=recalc(s);s.regions.forEach(r=>r.cohorts.push({str:clamp(r.part*.30+r.coach*.24+r.path*.28+r.fac*.08+r.pot*.10),pro:s.year+7}));
 s.year++;return n
}
const scenarios=[
 {name:"Balanced sustained",setup:(s,y)=>{if([2026,2034,2042,2050].includes(y))s.regions.forEach((r,i)=>{add(s,i,"facilities",true);add(s,i,"coaching",true);if(i%2===0)add(s,i,"schools",true)})}},
 {name:"One-off boom then stop",setup:(s,y)=>{if(y===2026)s.regions.forEach((r,i)=>{add(s,i,"facilities",false);add(s,i,"schools",false);add(s,i,"centre",false)})}},
 {name:"Pathway only",setup:(s,y)=>{if([2026,2032,2038,2044].includes(y))s.regions.forEach((r,i)=>{add(s,i,"talent",true);add(s,i,"coaching",true)})}},
 {name:"Infrastructure only",setup:(s,y)=>{if([2026,2036,2046].includes(y))s.regions.forEach((r,i)=>add(s,i,"facilities",true))}},
 {name:"Regional concentration",setup:(s,y)=>{if([2026,2033,2040,2047].includes(y))[2,3,6,9].forEach(i=>{add(s,i,"facilities",true);add(s,i,"coaching",true);add(s,i,"centre",true)})}},
 {name:"Neglect",setup:(s,y)=>{}}
];
let rows=[];
for(const sc of scenarios){let s=make();for(let i=0;i<30;i++){sc.setup(s,s.year);let n=advance(s);if([5,10,20,30].includes(i+1))rows.push({Scenario:sc.name,Year:i+1,Grass:+n.grass.toFixed(1),Infra:+n.infra.toFixed(1),Path:+n.path.toFixed(1),Production:+n.prod.toFixed(1),EnglandDepth:+n.depth.toFixed(1),Spend:+s.spend.toFixed(1)})}}
console.log("RFU DIRECTOR — DEVELOPMENT NETWORK STRESS TEST V1.8");
console.log("30-year audit. One-off investment should peak then decay; sustained renewal should outperform it.");
console.table(rows);
