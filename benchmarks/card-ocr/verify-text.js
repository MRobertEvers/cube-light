import{Qwen3VLForConditionalGeneration,AutoProcessor,RawImage,env}from'transformers-v4';
import{findTitleStrips,getCV}from'./edge-titles.js';import{bounds,sameLine}from'./photo-match.js';
env.allowLocalModels=true;env.allowRemoteModels=false;env.localModelPath='/models/';env.useBrowserCache=false;env.backends.onnx.wasm.numThreads=1;
window.verifyTextChoices=async()=>{
 const start=performance.now(),image=await createImageBitmap(await(await fetch('/res/IMG_8535.jpeg')).blob()),lines=await findTitleStrips(image),files=['font-lightband-v3','font-proposals-v2','font-plane-v7','font-bands-v6'];
 const all=(await Promise.all(files.map(f=>fetch(`/photo-results/${f}.json`).then(r=>r.json())))).flatMap(r=>r.outputs),regions=[];
 for(const r of all.sort((a,b)=>b.candidates[0].score-a.candidates[0].score)){
  if(r.candidates[0].score<.3||r.candidates[0].name.includes('_'))continue;const box=bounds(r.poly),cx=box.x+box.w/2,cy=box.y+box.h/2,angle=Math.atan2(r.poly[1][1]-r.poly[0][1],r.poly[1][0]-r.poly[0][0]);
  if(box.w<60||box.h<8)continue;
  if(!lines.some(l=>{const dx=cx-l.x1,dy=cy-l.y1,along=dx*Math.cos(l.angle)+dy*Math.sin(l.angle),down=-dx*Math.sin(l.angle)+dy*Math.cos(l.angle);return along>0&&along<l.length&&down>-5&&down<l.length*.2&&Math.abs(angle-l.angle)<.15;}))continue;
  if(regions.some(a=>sameLine(a.box,box)))continue;regions.push({...r,box});
 }
 regions.sort((a,b)=>a.box.y-b.box.y||a.box.x-b.box.x);console.log('GLM selected title regions',regions.length);
 const model=await Qwen3VLForConditionalGeneration.from_pretrained('qwen',{device:'webgpu',dtype:{embed_tokens:'q4f16',vision_encoder:'fp16',decoder_model_merged:'q4f16'}}),processor=await AutoProcessor.from_pretrained('qwen'),{cv}=await getCV(),canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;canvas.getContext('2d').drawImage(image,0,0);const src=cv.imread(canvas),outputs=[];
 try{
  for(const r of regions){const width=Math.max(32,Math.round(Math.hypot(r.poly[1][0]-r.poly[0][0],r.poly[1][1]-r.poly[0][1])*3)),height=Math.max(24,Math.round(Math.hypot(r.poly[3][0]-r.poly[0][0],r.poly[3][1]-r.poly[0][1])*3)),padded=8,from=cv.matFromArray(4,1,cv.CV_32FC2,r.poly.flat()),to=cv.matFromArray(4,1,cv.CV_32FC2,[padded,padded,width+padded,padded,width+padded,height+padded,padded,height+padded]),M=cv.getPerspectiveTransform(from,to),out=new cv.Mat();cv.warpPerspective(src,out,M,new cv.Size(width+padded*2,height+padded*2),cv.INTER_CUBIC,cv.BORDER_REPLICATE);const c=document.createElement('canvas');cv.imshow(c,out);
   const choices=r.candidates.map(c=>c.name),selected=[],answers=[];
   for(const order of [choices,[...choices].reverse()]){
    const text='Read the printed text in the image. Which candidate is the exact transcription? Answer only its number. Answer 0 if none matches or the text is unreadable.\n'+order.map((name,i)=>`${i+1}. ${name}`).join('\n');
    const prompt=processor.apply_chat_template([{role:'user',content:[{type:'image'},{type:'text',text}]}],{add_generation_prompt:true});
    const inputs=await processor(prompt,RawImage.fromCanvas(c)),ids=await model.generate({...inputs,max_new_tokens:8,do_sample:false}),answer=processor.tokenizer.decode(ids.tolist()[0].slice(inputs.input_ids.dims[1]),{skip_special_tokens:true}).trim(),number=Number(answer.match(/\b[0-5]\b/)?.[0]||0);
    answers.push(answer);selected.push(order[number-1]||null);
   }
   const agreed=selected[0]&&selected[0]===selected[1];outputs.push({poly:r.poly,choices,answers,selected,agreed,items:agreed?[{text:selected[0],score:1,poly:r.poly}]:[]});console.log(`Text verify ${outputs.length}/${regions.length}: ${JSON.stringify(selected)}`);
   for(const m of[from,to,M,out])m.delete();
  }
  return{engine:'text-candidate-verification',totalMs:performance.now()-start,outputs};
 }finally{src.delete();image.close();await model.dispose();}
};
