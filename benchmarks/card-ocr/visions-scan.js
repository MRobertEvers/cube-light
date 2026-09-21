import {makeLexicon,decodeLexicon}from'./ctc-lexicon.js';
import * as ort from 'onnxruntime-web';
import{findTitleStrips,stripCanvas,trimTitleBand,tightInkCrops}from'./edge-titles.js';
ort.env.wasm.numThreads=1;
const chars="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-,'Æ _";
window.scanVisions=async({model='visions',pad=0,trim=true,offsets=[0],oracle=false}={})=>{
 const start=performance.now(),session=await ort.InferenceSession.create(`/models/${model}/recognizer.onnx`,{executionProviders:['wasm']}),image=await createImageBitmap(await(await fetch('/res/IMG_8535.jpeg')).blob()),outputs=[],lexicon=makeLexicon(await(await fetch('/res/card-names.json')).json());
 try{
 const lines=await findTitleStrips(image);
 for(const line of lines)for(const offset of offsets){
  const strip=stripCanvas(image,line,{offset:0,height:.2,padding:0,right:0});
  for(const band of await tightInkCrops(strip.canvas)){
  if(pad){const original=band.canvas,context=original.getContext('2d'),values=context.getImageData(0,0,original.width,original.height).data,levels=[];for(let i=0;i<values.length;i+=16)levels.push(.299*values[i]+.587*values[i+1]+.114*values[i+2]);levels.sort((a,b)=>a-b);const bg=levels[Math.floor(levels.length*.8)]||200,padding=Math.ceil(original.height*pad),padded=document.createElement('canvas');padded.width=original.width+padding;padded.height=original.height+padding*2;const pc=padded.getContext('2d');pc.fillStyle=`rgb(${bg},${bg},${bg})`;pc.fillRect(0,0,padded.width,padded.height);pc.drawImage(original,padding/2,padding);band.canvas=padded;band.pad=padding;}
  const canvas=document.createElement('canvas');canvas.width=Math.min(312,Math.round(band.canvas.width/band.canvas.height*32));canvas.height=32;const ctx=canvas.getContext('2d');ctx.drawImage(band.canvas,0,0,canvas.width,32);const rgba=ctx.getImageData(0,0,canvas.width,32).data,input=new Float32Array(312*32);input.fill(.5);
  for(let x=0;x<canvas.width;x++)for(let y=0;y<32;y++){const i=(y*canvas.width+x)*4;input[x*32+y]=(.299*rgba[i]+.587*rgba[i+1]+.114*rgba[i+2])/255-.5;}
  const tensor=new ort.Tensor('float32',input,[1,312,32,1]),result=await session.run({pixels:tensor}),p=result.probabilities;let text='',last=-1,confidence=0,n=0;
  for(let t=0;t<78;t++){let best=0;for(let c=1;c<58;c++)if(p.data[t*58+c]>p.data[t*58+best])best=c;if(best!==57&&best!==last){text+=chars[best];confidence+=p.data[t*58+best];n++;}last=best;}
  const toImage=(x,y)=>strip.toImage(x+band.left-band.pad,y+band.top-band.pad),poly=[[band.pad,band.pad],[band.canvas.width-band.pad,band.pad],[band.canvas.width-band.pad,band.canvas.height-band.pad],[band.pad,band.canvas.height-band.pad]].map(p=>toImage(...p));
  const lexical=decodeLexicon(p.data,78,chars,lexicon,{skip:0});
  outputs.push({line,offset,lexical,items:[{text:text.trim().replaceAll('Æ','Ae'),score:n?confidence/n:0,poly}]});console.log(`Visions ${outputs.length}: ${text}`,JSON.stringify(lexical.slice(0,2)));tensor.dispose();p.dispose();
 }
 }
 return{engine:'visions',totalMs:performance.now()-start,outputs};
 }finally{image.close();await session.release();}
};
