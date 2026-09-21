import{createWorker}from'tesseract.js';
import{findTitleStrips,stripCanvas,trimTitleBand}from'./edge-titles.js';
window.scanTessLines=async()=>{
 const start=performance.now(),worker=await createWorker('eng',1,{langPath:'/models/tess-best',gzip:false,corePath:'/node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js'},{load_system_dawg:'0',load_freq_dawg:'0'});
 const image=await createImageBitmap(await(await fetch('/res/IMG_8535.jpeg')).blob()),lines=await findTitleStrips(image),outputs=[];
 try{
  await worker.setParameters({tessedit_pageseg_mode:'13',tessedit_char_whitelist:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ',.-"});
  for(const line of lines){const strip=stripCanvas(image,line,{offset:.02,height:.14,padding:.015,right:.05}),band=trimTitleBand(strip.canvas);
   const {data}=await worker.recognize(band.canvas);const poly=[[band.pad,band.pad],[band.canvas.width-band.pad,band.pad],[band.canvas.width-band.pad,band.canvas.height-band.pad],[band.pad,band.canvas.height-band.pad]].map(([x,y])=>strip.toImage(x+band.left-band.pad,y+band.top-band.pad));
   outputs.push({line,items:[{text:data.text.trim(),score:data.confidence/100,poly}]});console.log(`Tess best ${outputs.length}/${lines.length}: ${data.text}`);
  }
  return{engine:'tesseract-best',totalMs:performance.now()-start,outputs};
 }finally{image.close();await worker.terminate();}
};
