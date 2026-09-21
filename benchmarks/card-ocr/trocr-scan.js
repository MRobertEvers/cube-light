import {pipeline,RawImage,env}from'@huggingface/transformers';
import{findTitleStrips,stripCanvas,trimTitleBand}from'./edge-titles.js';
env.allowLocalModels=true;env.allowRemoteModels=false;env.localModelPath='/models/';env.backends.onnx.wasm.numThreads=1;
window.scanTrOCR=async({limit=0}={})=>{
 const start=performance.now(),pipe=await pipeline('image-to-text','trocr',{device:'wasm',dtype:'q8'});console.log('TrOCR ready');
 const image=await createImageBitmap(await(await fetch('/res/IMG_8535.jpeg')).blob()),lines=await findTitleStrips(image),outputs=[];
 try{for(const line of(limit?lines.slice(0,limit):lines)){
  const strip=stripCanvas(image,line,{offset:.02,height:.13,padding:.02,right:.12}),band=trimTitleBand(strip.canvas);
  const result=await pipe(RawImage.fromCanvas(band.canvas),{max_new_tokens:50,num_beams:1});
  const text=result[0].generated_text;outputs.push({line,items:[{text,score:1,poly:strip.poly}]});console.log(`TrOCR ${outputs.length}/${lines.length}: ${text}`);
 }
 return{engine:'trocr',totalMs:performance.now()-start,outputs};
 }finally{image.close();await pipe.dispose();}
};
