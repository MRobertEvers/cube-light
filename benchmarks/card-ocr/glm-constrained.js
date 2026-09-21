import{buildTokenCatalog,constrainedNameSearch}from'./catalog-logits.js';
import{GlmOcrForConditionalGeneration,AutoProcessor,RawImage,env}from'transformers-v4';
import{findTitleStrips,getCV}from'./edge-titles.js';import{bounds,sameLine}from'./photo-match.js';
env.allowLocalModels=true;env.allowRemoteModels=false;env.localModelPath='/models/';env.useBrowserCache=false;env.backends.onnx.wasm.numThreads=1;
window.scanConstrainedGLM=async({limit=0}={})=>{
 const start=performance.now(),image=await createImageBitmap(await(await fetch('/res/IMG_8535.jpeg')).blob()),lines=await findTitleStrips(image),files=['font-lightband-v3','font-proposals-v2','font-plane-v7','font-bands-v6'];
 const font=await new FontFace('GLMCatalogFont','url(/models/fonts/beleren.woff)').load();document.fonts.add(font);const measure=document.createElement('canvas').getContext('2d');measure.font='32px GLMCatalogFont';const typical=[...lines].sort((a,b)=>b.length-a.length)[Math.min(12,lines.length-1)].length;
 const all=(await Promise.all(files.map(f=>fetch(`/photo-results/${f}.json`).then(r=>r.json())))).flatMap(r=>r.outputs),regions=[];
 for(const r of all.sort((a,b)=>b.candidates[0].score-a.candidates[0].score)){
  if(r.candidates[0].score<.3||r.candidates[0].name.includes('_'))continue;const box=bounds(r.poly),aspect=Math.hypot(r.poly[1][0]-r.poly[0][0],r.poly[1][1]-r.poly[0][1])/Math.hypot(r.poly[3][0]-r.poly[0][0],r.poly[3][1]-r.poly[0][1]);
  const filtered=r.candidates.filter(c=>{const m=measure.measureText(c.name),reference=m.width/(m.actualBoundingBoxAscent+m.actualBoundingBoxDescent),ratio=aspect/reference;return ratio>.6&&ratio<2.5&&c.name.replace(/[^a-z]/gi,'').length>=4;});if(!filtered.length)continue;
  const cx=box.x+box.w/2,cy=box.y+box.h/2,angle=Math.atan2(r.poly[1][1]-r.poly[0][1],r.poly[1][0]-r.poly[0][0]);
  if(box.w<60||box.h<8)continue;
  if(!lines.some(l=>{const dx=cx-l.x1,dy=cy-l.y1,along=dx*Math.cos(l.angle)+dy*Math.sin(l.angle),down=-dx*Math.sin(l.angle)+dy*Math.cos(l.angle);return along>-typical*.1&&along<l.length+typical*.1&&down>-5&&down<typical*.2&&Math.abs(angle-l.angle)<.15;}))continue;
  const duplicate=regions.find(a=>sameLine(a.box,box)&&Math.min(a.box.w,box.w)/Math.max(a.box.w,box.w)>.8&&Math.min(a.box.h,box.h)/Math.max(a.box.h,box.h)>.7);
  if(duplicate){const byName=new Map();for(const c of [...duplicate.candidates,...filtered])if(c.score>(byName.get(c.name)?.score??-1))byName.set(c.name,c);duplicate.candidates=[...byName.values()].sort((a,b)=>b.score-a.score);if(box.w>duplicate.box.w){duplicate.poly=r.poly;duplicate.box=box;}continue;}
  regions.push({...r,candidates:filtered,box});
 }
 // Keep nested proposals: a larger frame crop can otherwise swallow the actual title.
 const selectionMs=performance.now()-start,loadStart=performance.now();
 regions.sort((a,b)=>a.box.y-b.box.y||a.box.x-b.box.x);console.log('GLM selected title regions',regions.length);
 const model=await GlmOcrForConditionalGeneration.from_pretrained('glm',{device:'webgpu',dtype:'fp16'}),processor=await AutoProcessor.from_pretrained('glm'),{cv}=await getCV(),canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;canvas.getContext('2d').drawImage(image,0,0);const src=cv.imread(canvas),outputs=[];
 const catalogNames=await(await fetch('/res/card-names.json')).json(),catalog=buildTokenCatalog(processor.tokenizer,catalogNames,model.generation_config.eos_token_id);console.log('Catalog ready',catalogNames.length,catalog.nodes.length);
 const loadMs=performance.now()-loadStart,inferenceStart=performance.now();
 try{const prompt=processor.apply_chat_template([{role:'user',content:[{type:'image'},{type:'text',text:'Text Recognition:'}]}],{add_generation_prompt:true});
  for(const r of(limit?regions.slice(0,limit):regions)){const width=Math.max(32,Math.round(Math.hypot(r.poly[1][0]-r.poly[0][0],r.poly[1][1]-r.poly[0][1])*3)),height=Math.max(24,Math.round(Math.hypot(r.poly[3][0]-r.poly[0][0],r.poly[3][1]-r.poly[0][1])*3)),padded=8,from=cv.matFromArray(4,1,cv.CV_32FC2,r.poly.flat()),to=cv.matFromArray(4,1,cv.CV_32FC2,[padded,padded,width+padded,padded,width+padded,height+padded,padded,height+padded]),M=cv.getPerspectiveTransform(from,to),out=new cv.Mat();cv.warpPerspective(src,out,M,new cv.Size(width+padded*2,height+padded*2),cv.INTER_CUBIC,cv.BORDER_REPLICATE);const c=document.createElement('canvas');cv.imshow(c,out);
   const inputs=await processor(prompt,RawImage.fromCanvas(c)),result=await constrainedNameSearch(model,inputs,catalog,{seeds:r.candidates.slice(0,16).map(c=>c.name),maxAlternatives:4});
   const best=result.ranked[0];outputs.push({result,seeds:r.candidates.map(c=>c.name),poly:r.poly,items:best?[{text:best.name,score:best.rawTokenSupport,poly:r.poly}]:[]});console.log(`Constrained GLM ${outputs.length}/${regions.length}: ${JSON.stringify(result.ranked.slice(0,3))}`);
   for(const m of[from,to,M,out])m.delete();
  }
  return{engine:'glm-ocr-catalog-constrained',totalMs:performance.now()-start,timings:{selectionMs,loadMs,inferenceMs:performance.now()-inferenceStart},selectedRegions:regions.length,processedRegions:outputs.length,usesCachedProposals:true,outputs};
 }finally{src.delete();image.close();await model.dispose();}
};
