import{findTitleStrips,stripCanvas,tightInkCrops}from'./edge-titles.js';
import{createRecognizer}from'./direct-recognizer.js';
window.scanInk=async({model='small',deblur=0}={})=>{
 const start=performance.now(),worker=await createRecognizer(model,1,false,deblur,true),image=await createImageBitmap(await(await fetch('/res/IMG_8535.jpeg')).blob()),outputs=[];
 try{for(const line of await findTitleStrips(image)){
   const strip=stripCanvas(image,line,{offset:0,height:.2,padding:0,right:0});
   for(const band of await tightInkCrops(strip.canvas)){
    const result=await worker.recognize(band.canvas),poly=[[0,0],[band.canvas.width,0],[band.canvas.width,band.canvas.height],[0,band.canvas.height]].map(([x,y])=>strip.toImage(x+band.left,y+band.top));
    outputs.push({line,lexical:result.lexical,items:[{text:result.text,score:result.score,poly}]});console.log(`Ink ${outputs.length}: ${result.text}`,JSON.stringify(result.lexical?.slice(0,2)));
   }
 }
 return{engine:'ink-'+model,deblur,totalMs:performance.now()-start,outputs};
 }finally{image.close();worker.dispose();}
};
