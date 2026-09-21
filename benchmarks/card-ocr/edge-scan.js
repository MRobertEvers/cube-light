import { createRecognizer } from './direct-recognizer.js';
import { PaddleOCR } from '@paddleocr/paddleocr-js';
import { createWorker } from 'tesseract.js';
import {findTitleStrips,stripCanvas,trimTitleBand} from './edge-titles.js';
window.scanEdges=async({url='/res/IMG_8535.jpeg',engine='paddle',recModel='small',stretch=1,enhance=false,trim=false,onProgress}={})=>{
 const image=await createImageBitmap(await(await fetch(url)).blob()),start=performance.now();
 let worker;
 try{
  const lines=await findTitleStrips(image);console.log(`Found ${lines.length} edges`);
  worker=engine==='direct'?await createRecognizer(recModel,stretch,enhance):engine==='tesseract'?await createWorker('eng'):await PaddleOCR.create({worker:true,textDetectionModelName:'PP-OCRv5_mobile_det',textRecognitionModelName:'PP-OCRv6_small_rec',ortOptions:{backend:'wasm',numThreads:1,simd:true}});
  if(engine==='tesseract')await worker.setParameters({tessedit_pageseg_mode:'7'});
  const outputs=[];
  for(const line of lines){
  for(const offset of (trim?[.015]:[.02,.05,.08,.11])){
   const strip=stripCanvas(image,line,{offset,height:trim?.18:.075,padding:.015,right:.015});
   const {canvas}=trim?trimTitleBand(strip.canvas):strip;const {poly,toImage}=strip;
   let items;
   if(engine==='direct'){const result=await worker.recognize(canvas);items=[{text:result.text,score:result.score,poly}];}
   else if(engine==='tesseract'){const {data}=await worker.recognize(canvas);items=[{text:data.text.trim(),score:data.confidence/100,poly}];}
   else items=(await worker.predict(canvas,{textDetThresh:.15,textDetBoxThresh:.3,textRecScoreThresh:.3}))[0].items.map(i=>({...i,poly:i.poly.map(p=>toImage(...p))}));
   outputs.push({line,offset,items});console.log(`${engine} edge ${outputs.length}/${lines.length*4}`);onProgress?.({completed:outputs.length,total:lines.length*4,items});
  }
  }
  return {engine,mode:'edges',width:image.width,height:image.height,totalMs:performance.now()-start,lines,outputs};
 }finally{image.close();await worker?.dispose?.();await worker?.terminate?.();}
};
