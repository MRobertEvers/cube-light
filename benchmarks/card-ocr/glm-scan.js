import{GlmOcrForConditionalGeneration,AutoProcessor,RawImage,env}from'transformers-v4';
import{findTitleStrips,stripCanvas}from'./edge-titles.js';
import{expandedLines}from'./expanded-scan.js';
env.allowLocalModels=true;env.allowRemoteModels=false;env.localModelPath='/models/';env.useBrowserCache=false;env.backends.onnx.wasm.numThreads=1;
window.scanGLM=async({limit=0,expanded=false}={})=>{
 const start=performance.now(),model=await GlmOcrForConditionalGeneration.from_pretrained('glm',{device:'webgpu',dtype:'fp16'}),processor=await AutoProcessor.from_pretrained('glm');console.log('GLM ready',(performance.now()-start)/1000);
 const image=await createImageBitmap(await(await fetch('/res/IMG_8535.jpeg')).blob()),lines=expanded?await expandedLines(image):await findTitleStrips(image),outputs=[];
 try{
  const prompt=processor.apply_chat_template([{role:'user',content:[{type:'image'},{type:'text',text:'Text Recognition:'}]}],{add_generation_prompt:true});
  for(const line of(limit?lines.slice(0,limit):lines)){
   const strip=stripCanvas(image,line,{offset:.02,height:.13,padding:.01,right:.02});
   const inputs=await processor(prompt,RawImage.fromCanvas(strip.canvas));
   const ids=await model.generate({...inputs,max_new_tokens:80,do_sample:false});
   const text=processor.tokenizer.decode(ids.tolist()[0].slice(inputs.input_ids.dims[1]),{skip_special_tokens:true}).trim();
   outputs.push({line,items:[{text,score:1,poly:strip.poly}]});console.log(`GLM ${outputs.length}/${lines.length}: ${text}`);
  }
  return{engine:'glm-ocr',model:'onnx-community/GLM-OCR-ONNX',dtype:'fp16',expanded,totalMs:performance.now()-start,outputs};
 }finally{image.close();await model.dispose();}
};
