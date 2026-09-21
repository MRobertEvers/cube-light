import{GlmOcrForConditionalGeneration,AutoProcessor,RawImage,env}from'transformers-v4';
import{findTitleStrips,getCV}from'./edge-titles.js';import{bounds,sameLine}from'./photo-match.js';
env.allowLocalModels=true;env.allowRemoteModels=false;env.localModelPath='/models/';env.useBrowserCache=false;env.backends.onnx.wasm.numThreads=1;
window.scanGLMRegions=async()=>{
 const start=performance.now(),image=await createImageBitmap(await(await fetch('/res/IMG_8535.jpeg')).blob()),lines=await findTitleStrips(image),files=['font-lightband-v3','font-proposals-v2','font-plane-v7','font-bands-v6'];
 const all=(await Promise.all(files.map(f=>fetch(`/photo-results/${f}.json`).then(r=>r.json())))).flatMap(r=>r.outputs),regions=[];
 for(const r of all.sort((a,b)=>b.candidates[0].score-a.candidates[0].score)){
  if(r.candidates[0].score<.3||r.candidates[0].name.includes('_'))continue;const box=bounds(r.poly),cx=box.x+box.w/2,cy=box.y+box.h/2,angle=Math.atan2(r.poly[1][1]-r.poly[0][1],r.poly[1][0]-r.poly[0][0]);
  if(box.w<60||box.h<8)continue;
  if(!lines.some(l=>{const dx=cx-l.x1,dy=cy-l.y1,along=dx*Math.cos(l.angle)+dy*Math.sin(l.angle),down=-dx*Math.sin(l.angle)+dy*Math.cos(l.angle);return along>0&&along<l.length&&down>-5&&down<l.length*.2&&Math.abs(angle-l.angle)<.15;}))continue;
  if(regions.some(a=>sameLine(a.box,box)))continue;regions.push({...r,box});
 }
 regions.sort((a,b)=>a.box.y-b.box.y||a.box.x-b.box.x);console.log('GLM selected title regions',regions.length);
 const model=await GlmOcrForConditionalGeneration.from_pretrained('glm',{device:'webgpu',dtype:'fp16'}),processor=await AutoProcessor.from_pretrained('glm'),{cv}=await getCV(),canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;canvas.getContext('2d').drawImage(image,0,0);const src=cv.imread(canvas),outputs=[];
 try{const prompt=processor.apply_chat_template([{role:'user',content:[{type:'image'},{type:'text',text:'Text Recognition:'}]}],{add_generation_prompt:true});
  for(const r of regions){const width=Math.max(32,Math.round(Math.hypot(r.poly[1][0]-r.poly[0][0],r.poly[1][1]-r.poly[0][1])*3)),height=Math.max(24,Math.round(Math.hypot(r.poly[3][0]-r.poly[0][0],r.poly[3][1]-r.poly[0][1])*3)),padded=8,from=cv.matFromArray(4,1,cv.CV_32FC2,r.poly.flat()),to=cv.matFromArray(4,1,cv.CV_32FC2,[padded,padded,width+padded,padded,width+padded,height+padded,padded,height+padded]),M=cv.getPerspectiveTransform(from,to),out=new cv.Mat();cv.warpPerspective(src,out,M,new cv.Size(width+padded*2,height+padded*2),cv.INTER_CUBIC,cv.BORDER_REPLICATE);const c=document.createElement('canvas');cv.imshow(c,out);
   const inputs=await processor(prompt,RawImage.fromCanvas(c)),ids=await model.generate({...inputs,max_new_tokens:64,do_sample:false}),text=processor.tokenizer.decode(ids.tolist()[0].slice(inputs.input_ids.dims[1]),{skip_special_tokens:true}).trim();outputs.push({items:[{text,score:1,poly:r.poly}]});console.log(`GLM region ${outputs.length}/${regions.length}: ${text}`);for(const m of[from,to,M,out])m.delete();
  }
  return{engine:'glm-ocr-regions',totalMs:performance.now()-start,outputs};
 }finally{src.delete();image.close();await model.dispose();}
};
