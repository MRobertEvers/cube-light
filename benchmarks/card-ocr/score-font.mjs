import fs from'node:fs';import{bounds,sameLine}from'./photo-match.js';import{evaluatePhoto}from'./evaluate-photo.js';
const root=new URL('./',import.meta.url),read=p=>JSON.parse(fs.readFileSync(new URL(p,root)));const truth=read('photo-ground-truth.json'),baseline=read('photo-results/final.json').candidates.filter(c=>c.status==='accepted');
const d=read('photo-results/'+(process.argv[2]||'font-refined-v8')+'.json');
for(const threshold of [.5,.6,.65,.7,.75])for(const gap of [.04,.08,.12]){
 const candidates=baseline.map(c=>({...c}));for(const row of [...d.outputs].sort((a,b)=>b.candidates[0].score-a.candidates[0].score)){const [best,next]=row.candidates;if(!best||best.score<threshold||best.score-(next?.score||0)<gap||best.name.includes('_')||best.name.replace(/[^a-z]/gi,'').length<8)continue;const c={name:best.name,score:best.score,text:'Optical text fit',status:'accepted',poly:row.poly,box:bounds(row.poly)};if(!candidates.some(a=>sameLine(a.box,c.box)))candidates.push(c);}
 const m=evaluatePhoto(candidates,truth);console.log(threshold,gap,JSON.stringify({names:m.uniqueCorrect,correct:m.correct,false:m.falsePositives.map(c=>c.name),hitNames:[...new Set(m.hits.map(c=>c.name))]}));
}
