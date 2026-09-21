import * as ort from 'onnxruntime-web';
import{findTitleStrips,stripCanvas,tightInkCrops}from'./edge-titles.js';
ort.env.wasm.numThreads=1;
window.scanMGP=async()=>{
 const start=performance.now(),session=await ort.InferenceSession.create('/models/mgp/model_quantized.onnx',{executionProviders:['wasm']}),vocab=await(await fetch('/models/mgp/vocab.json')).json();
 console.log('MGP ready',session.inputNames,session.outputNames);
 const chars=Object.fromEntries(Object.entries(vocab).map(([c,i])=>[i,c])),names=(await(await fetch('/res/card-names.json')).json()).filter(n=>!n.startsWith('A-')).map(name=>({name,key:name.toLowerCase().replace(/[^a-z0-9]/g,'')})).filter(n=>n.key.length>3&&n.key.length<=25);
 const image=await createImageBitmap(await(await fetch('/res/IMG_8535.jpeg')).blob()),outputs=[];
 try{for(const line of await findTitleStrips(image)){
  const strip=stripCanvas(image,line,{offset:.025,height:.11,padding:.02,right:.08});
  const bands=[{canvas:strip.canvas,left:0,top:0,pad:0},...(await tightInkCrops(strip.canvas)).slice(0,1)];
  for(const band of bands){const c=document.createElement('canvas');c.width=128;c.height=32;const ctx=c.getContext('2d');ctx.drawImage(band.canvas,0,0,128,32);const rgba=ctx.getImageData(0,0,128,32).data,input=new Float32Array(3*128*32);for(let i=0;i<128*32;i++)for(let k=0;k<3;k++)input[k*128*32+i]=rgba[i*4+k]/255;
   const tensor=new ort.Tensor('float32',input,[1,3,32,128]),r=await session.run({[session.inputNames[0]]:tensor}),out=r[session.outputNames[0]],classes=out.dims[2],steps=out.dims[1],logp=[],post=[];let text='',score=0,count=0;
   for(let t=0;t<steps;t++){const row=Array.from(out.data.slice(t*classes,(t+1)*classes)),max=Math.max(...row),sum=row.reduce((s,v)=>s+Math.exp(v-max),0),lp=row.map(v=>v-max-Math.log(sum));logp.push(lp);let best=row.indexOf(max);post.push(best);if(t>0&&count>=0){if(best===1){count=-count-1;}else{text+=chars[best]||'';score+=Math.exp(lp[best]);count++;}}}
   const lexical=names.map(n=>{let sum=0;for(let i=0;i<n.key.length;i++)sum+=logp[i+1][vocab[n.key[i]]];sum+=logp[n.key.length+1][1];return{name:n.name,logProbability:sum,perCharacter:Math.exp(sum/(n.key.length+1))};}).sort((a,b)=>b.logProbability-a.logProbability).slice(0,5);
   const poly=[[0,0],[band.canvas.width,0],[band.canvas.width,band.canvas.height],[0,band.canvas.height]].map(([x,y])=>strip.toImage(x+band.left,y+band.top));
   outputs.push({line,lexical,items:[{text,score:score/Math.max(1,Math.abs(count)-1),poly}]});console.log(`MGP ${outputs.length}: ${text}`,JSON.stringify(lexical.slice(0,2)));tensor.dispose();Object.values(r).forEach(t=>t.dispose());
  }
 }return{engine:'mgp-str',totalMs:performance.now()-start,outputs};}finally{image.close();await session.release();}
};
