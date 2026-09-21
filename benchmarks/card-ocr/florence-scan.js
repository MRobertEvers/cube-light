import {Florence2ForConditionalGeneration,AutoProcessor,AutoTokenizer,RawImage,env} from '@huggingface/transformers';
import {findTitleStrips,stripCanvas}from'./edge-titles.js';
env.allowLocalModels=true;env.allowRemoteModels=false;env.localModelPath='/models/';env.backends.onnx.wasm.numThreads=1;
window.scanFlorence=async({mode='tiles',tileSize=1400,limit=0}={})=>{
 const start=performance.now();
 const model=await Florence2ForConditionalGeneration.from_pretrained('florence',{device:'webgpu',dtype:{embed_tokens:'fp16',vision_encoder:'fp16',encoder_model:'q4',decoder_model_merged:'q4'}});
 const processor=await AutoProcessor.from_pretrained('florence');
 const tokenizer=await AutoTokenizer.from_pretrained('florence');
 console.log('Florence ready',performance.now()-start);
 const im=await createImageBitmap(await(await fetch('/res/IMG_8535.jpeg')).blob());
 const regions=[];
 if(mode==='tiles'){
  for(let y=0;y<im.height;y+=tileSize*.75)for(let x=0;x<im.width;x+=tileSize*.75){if(im.width-x<tileSize*.25||im.height-y<tileSize*.25)continue;regions.push({x,y,w:Math.min(tileSize,im.width-x),h:Math.min(tileSize,im.height-y)});}
 }else{
  for(const line of await findTitleStrips(im)){const strip=stripCanvas(im,line,{offset:.02,height:.13,padding:0,right:0});regions.push({line,strip});}
 }
 if(mode==='sheets'){
  const strips=regions.splice(0);
  for(let i=0;i<strips.length;i+=10){
   const c=document.createElement('canvas');c.width=1100;c.height=1000;const ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,c.width,c.height);
   const placements=[];
   for(let j=0;j<Math.min(10,strips.length-i);j++){
    const strip=strips[i+j].strip,scale=Math.min(1,1060/strip.canvas.width,90/strip.canvas.height),x=20,y=j*100+5;
    ctx.drawImage(strip.canvas,x,y,strip.canvas.width*scale,strip.canvas.height*scale);placements.push({x,y,scale,w:strip.canvas.width*scale,h:strip.canvas.height*scale,strip});
   }
   regions.push({strip:{canvas:c},placements});
  }
 }
 const outputs=[];
 try{
  for(const region of (limit?regions.slice(0,limit):regions)){
   let c=region.strip?.canvas;
   if(!c){c=document.createElement('canvas');c.width=region.w;c.height=region.h;c.getContext('2d').drawImage(im,region.x,region.y,region.w,region.h,0,0,c.width,c.height);}
   const inputs=await processor(RawImage.fromCanvas(c));
   const prompt=(mode==='tiles'||mode==='sheets')?'What is the text in the image, with regions?':'What is the text in the image?';
   const ids=await model.generate({...inputs,...tokenizer(prompt),max_new_tokens:(mode==='tiles'||mode==='sheets')?768:100,num_beams:1,do_sample:false});
   const raw=tokenizer.batch_decode(ids,{skip_special_tokens:false})[0];
   const items=[];
   if(mode==='tiles'||mode==='sheets')for(const match of raw.matchAll(/([^<>]+)((?:<loc_\d+>){8})/g)){
    const coords=[...match[2].matchAll(/<loc_(\d+)>/g)].map(m=>Number(m[1]));
    const local=Array.from({length:4},(_,i)=>[coords[i*2]/1000*c.width,coords[i*2+1]/1000*c.height]);
    const center=local.reduce((p,v)=>[p[0]+v[0]/4,p[1]+v[1]/4],[0,0]);
    const placement=region.placements?.find(p=>center[1]>=p.y&&center[1]<=p.y+p.h&&center[0]>=p.x&&center[0]<=p.x+p.w);
    if(mode==='sheets'&&!placement)continue;
    const poly=placement?local.map(([x,y])=>placement.strip.toImage((x-placement.x)/placement.scale,(y-placement.y)/placement.scale)):local.map(([x,y])=>[x+region.x,y+region.y]);
    items.push({text:match[1].trim(),score:1,poly});
   }else items.push({text:raw.replace(/<[^>]+>/g,'').trim(),score:1,poly:region.strip.poly});
   outputs.push({region:region.strip?{line:region.line}:region,raw,items});
   console.log(`Florence ${outputs.length}/${regions.length}`,raw.slice(0,600));
  }
  return{engine:'florence',mode,totalMs:performance.now()-start,outputs};
 }finally{im.close();await model.dispose();}
};
