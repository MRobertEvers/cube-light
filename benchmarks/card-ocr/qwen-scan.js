import{Qwen3VLForConditionalGeneration,AutoProcessor,RawImage,env}from'transformers-v4';
import{findTitleStrips,stripCanvas}from'./edge-titles.js';
env.allowLocalModels=true;env.allowRemoteModels=false;env.localModelPath='/models/';env.backends.onnx.wasm.numThreads=1;
window.scanQwen=async({limit=0}={})=>{
 const start=performance.now(),model=await Qwen3VLForConditionalGeneration.from_pretrained('qwen',{device:'webgpu',dtype:{embed_tokens:'q4f16',vision_encoder:'fp16',decoder_model_merged:'q4f16'}}),processor=await AutoProcessor.from_pretrained('qwen');
 console.log('Qwen model ready',performance.now()-start);
 const im=await createImageBitmap(await(await fetch('/res/IMG_8535.jpeg')).blob()),lines=await findTitleStrips(im),outputs=[];
 try{for(let at=0;at<lines.length;at+=8){if(limit&&outputs.length>=limit)break;
  const subset=lines.slice(at,at+8),c=document.createElement('canvas');c.width=1100;c.height=subset.length*120;const ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,c.width,c.height);const strips=[];
  for(let j=0;j<subset.length;j++){
   const strip=stripCanvas(im,subset[j],{offset:.025,height:.12,padding:.015,right:.02});strips.push(strip);
   const scale=Math.min(1000/strip.canvas.width,100/strip.canvas.height);ctx.drawImage(strip.canvas,80,j*120+10,strip.canvas.width*scale,strip.canvas.height*scale);ctx.fillStyle='black';ctx.font='24px sans-serif';ctx.fillText(`${j+1}.`,10,j*120+50);
  }
  const message='Transcribe the printed text in each numbered row. Return only a JSON array of objects with row (integer) and text (string). Preserve partial words. For blank or unreadable rows use an empty text string. Do not invent missing text.';
  const prompt=processor.apply_chat_template([{role:'user',content:[{type:'image'},{type:'text',text:message}]}],{add_generation_prompt:true});
  const inputs=await processor(prompt,RawImage.fromCanvas(c));console.log('Qwen input',at,inputs.pixel_values?.dims,inputs.input_ids.dims);
  const ids=await model.generate({...inputs,max_new_tokens:512,do_sample:false});
  const raw=processor.tokenizer.decode(ids.tolist()[0].slice(inputs.input_ids.dims[1]),{skip_special_tokens:true});console.log('Qwen output',raw);
  let rows=[];try{rows=JSON.parse(raw.match(/\[[\s\S]*\]/)?.[0]||'[]');}catch{}
  const items=rows.filter(r=>Number.isInteger(r.row)&&r.row>=1&&r.row<=strips.length&&typeof r.text==='string').map(r=>({text:r.text,score:1,poly:strips[r.row-1].poly}));
  outputs.push({at,raw,items});
 }return{engine:'qwen-text-only',totalMs:performance.now()-start,outputs};}finally{im.close();await model.dispose();}
};
