import{findTitleStrips,stripCanvas}from'./edge-titles.js';import{createRecognizer}from'./direct-recognizer.js';
export async function expandedLines(image){
 const lines=await findTitleStrips(image),lengths=lines.map(l=>l.length).sort((a,b)=>b-a),typical=lengths[Math.min(15,lengths.length-1)]||image.width/10,result=[];
 for(const line of lines){
  for(const width of Array.from(new Set([line.length,Math.max(line.length,typical)]))){
   for(const align of (width>line.length*1.15?[0,.5,1]:[0])){
    const d=(width-line.length)*align,c=Math.cos(line.angle),s=Math.sin(line.angle),x1=line.x1-d*c,y1=line.y1-d*s;
    result.push({x1,y1,x2:x1+width*c,y2:y1+width*s,length:width,angle:line.angle});
   }
  }
 }
 return result;
}
window.scanExpanded=async({model='small'}={})=>{
 const start=performance.now(),image=await createImageBitmap(await(await fetch('/res/IMG_8535.jpeg')).blob()),worker=await createRecognizer(model),outputs=[];
 try{const lines=await expandedLines(image);for(const line of lines){for(const offset of [.025,.05,.075]){
 const strip=stripCanvas(image,line,{offset,height:.07,padding:.03,right:.02}),r=await worker.recognize(strip.canvas);
 outputs.push({line,offset,items:[{text:r.text,score:r.score,poly:strip.poly}]});if(r.text.length>4)console.log(`Expanded ${outputs.length}: ${r.text}`);
 }}return{engine:'expanded-'+model,totalMs:performance.now()-start,outputs};}finally{image.close();worker.dispose();}
};
