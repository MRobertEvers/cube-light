import {readFile,writeFile} from 'node:fs/promises';
import {bounds,sameLine,buildIndex,matchDetections} from './photo-match.js';
import {addTextConsensus} from './consensus.js';
import {evaluatePhoto} from './evaluate-photo.js';
const read=async name=>JSON.parse(await readFile(new URL(name,import.meta.url),'utf8'));
const truth=await read('photo-ground-truth.json'),baseline=await read('photo-results/final.json');
const candidates=baseline.candidates.filter(c=>c.status==='accepted');
const files=['font-refined-v8','font-refined-lightband-v12'];
const rows=(await Promise.all(files.map(f=>read('photo-results/'+f+'.json')))).flatMap(r=>r.outputs);
for(const row of rows.sort((a,b)=>b.candidates[0].score-a.candidates[0].score)){
 const [best,next]=row.candidates;
 if(!best||best.score<.75||best.score-(next?.score||0)<.12||best.name.includes('_')||best.name.replace(/[^a-z]/gi,'').length<8)continue;
 const c={name:best.name,score:best.score,text:'Printed-name glyph fit',status:'accepted',poly:row.poly,box:bounds(row.poly)};
 if(!candidates.some(a=>sameLine(a.box,c.box)))candidates.push(c);
}
const hybrid={scope:'Composite of cached browser experiments; not integrated end-to-end timing',inputs:['final',...files],totalMs:null,candidates,names:[...new Set(candidates.map(c=>c.name))].sort(),metrics:evaluatePhoto(candidates,truth)};
await writeFile(new URL('photo-results/hybrid-v12.json',import.meta.url),JSON.stringify(hybrid,null,2));
const rough=(await Promise.all(['font-lightband-v3','font-proposals-v2','font-plane-v7','font-bands-v6'].map(f=>read('photo-results/'+f+'.json')))).flatMap(r=>r.outputs);
const glm=await read('photo-results/glm-constrained-preserve-crops-v4.json');
const consensusCandidates=addTextConsensus(candidates,glm.outputs,rough);
const consensus={scope:'Cached experimental composite, thresholds tuned on this photo',totalMs:null,integrated:false,candidates:consensusCandidates,names:[...new Set(consensusCandidates.map(c=>c.name))].sort(),metrics:evaluatePhoto(consensusCandidates,truth)};
await writeFile(new URL('photo-results/consensus-v14.json',import.meta.url),JSON.stringify(consensus,null,2));
const index=buildIndex(await read('res/card-names.json'));
const experiments=[];
for(const file of ['glm-title-regions','glm-constrained-first','glm-constrained-v2','glm-constrained-v3','glm-constrained-preserve-crops-v4']){
 let run;try{run=await read('photo-results/'+file+'.json');}catch{continue;}
 const constrained=file.startsWith('glm-constrained');
 const accepted=constrained?run.outputs.filter(r=>r.result.status==='accepted').map(r=>({name:r.result.ranked[0].name,status:'accepted',box:bounds(r.poly),poly:r.poly,text:r.result.ranked[0].name})):matchDetections(run.outputs,index);
 const m=evaluatePhoto(accepted,truth);
 experiments.push({file,scope:constrained?'Partial region experiment':'Uses cached automatic crop proposals',milliseconds:run.totalMs,timings:run.timings,regions:run.outputs.length,distinctNames:m.uniqueCorrect,correctTitleInstances:m.correct,falsePositives:m.falsePositives.map(c=>c.name)});
}
const original=await read('photo-benchmark-summary.json');
original.metrics=evaluatePhoto(baseline.candidates,truth);
original.annotationRevision=truth.annotationRevision;
original.followup={date:new Date().toISOString(),bestComposite:{names:consensus.names,metrics:consensus.metrics,totalMs:null,integrated:false},opticalComposite:{names:hybrid.names,metrics:hybrid.metrics},experiments};
await writeFile(new URL('photo-benchmark-summary.json',import.meta.url),JSON.stringify(original,null,2)+'\n');
console.log(JSON.stringify({consensus:{names:consensus.names,distinct:consensus.metrics.uniqueCorrect,correct:consensus.metrics.correct,false:consensus.metrics.falsePositives.length},hybrid:{names:hybrid.names,distinct:hybrid.metrics.uniqueCorrect,correct:hybrid.metrics.correct,false:hybrid.metrics.falsePositives.length},experiments},null,2));
