// Closed-vocabulary optical text matching. Compares rendered glyphs, never artwork.
import {rectifyPlane}from'./rectify-plane.js';
import {titleProposals}from'./title-proposals.js';
import{findTitleStrips,stripCanvas,tightInkCrops,lightTitleBand,mserInkCrops}from'./edge-titles.js';
const W=96,H=16,D=W*H;
function descriptor(input,shear=0,blur=0){
 const c=document.createElement('canvas');c.width=W;c.height=H;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.fillStyle='#dddddd';ctx.fillRect(0,0,W,H);ctx.scale(W/input.width,H/input.height);ctx.transform(1,0,-shear,1,shear*input.height/2,0);ctx.filter=`blur(${blur}px)`;ctx.drawImage(input,0,0);ctx.setTransform(1,0,0,1,0,0);const p=ctx.getImageData(0,0,W,H).data,v=new Float32Array(D),proj=new Float32Array(W);
 for(let y=0;y<H;y++){let mean=0;for(let x=0;x<W;x++){const i=(y*W+x)*4;v[y*W+x]=.299*p[i]+.587*p[i+1]+.114*p[i+2];mean+=v[y*W+x]/W;}for(let x=0;x<W;x++){v[y*W+x]=mean-v[y*W+x];proj[x]+=v[y*W+x];}}
 const norm=Math.hypot(...v)||1,pnorm=Math.hypot(...proj)||1;for(let i=0;i<D;i++)v[i]/=norm;for(let i=0;i<W;i++)proj[i]/=pnorm;return{v,proj};
}
async function makeFontIndex(names,blur=0,fontFile="beleren.woff"){
 const font=await new FontFace('OCRFont',`url(/models/fonts/${fontFile})`).load();document.fonts.add(font);
 const c=document.createElement('canvas'),ctx=c.getContext('2d',{willReadFrequently:true}),features=new Float32Array(names.length*D),projections=new Float32Array(names.length*W);
 for(let i=0;i<names.length;i++){
  ctx.font='32px OCRFont';const m=ctx.measureText(names[i]),a=Math.ceil(m.actualBoundingBoxAscent),d=Math.ceil(m.actualBoundingBoxDescent);c.width=Math.max(1,Math.ceil(m.width));c.height=Math.max(1,a+d);ctx.font='32px OCRFont';ctx.fillStyle='white';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='black';ctx.fillText(names[i],0,a);const f=descriptor(c,0,blur);features.set(f.v,i*D);projections.set(f.proj,i*W);
  if(i%1000===0){console.log('Font index',i);await new Promise(r=>setTimeout(r,0));}
 }
 return{names,features,projections};
}
function lookup(c,index,shear=0){const f=descriptor(c,shear),short=[];
 for(let i=0;i<index.names.length;i++){let score=0;for(let j=0;j<W;j++)score+=f.proj[j]*index.projections[i*W+j];if(short.length<100||score>short.at(-1).score){short.push({i,score});short.sort((a,b)=>b.score-a.score);if(short.length>100)short.pop();}}
 return short.map(({i})=>{let score=0;for(let j=0;j<D;j++)score+=f.v[j]*index.features[i*D+j];return{name:index.names[i],score};}).sort((a,b)=>b.score-a.score).slice(0,5);
}
window.scanFontOCR=async({blur=1.3,rectify=false,fontFile="beleren.woff"}={})=>{
 const start=performance.now(),names=(await(await fetch('/res/card-names.json')).json()).filter(n=>!n.startsWith('A-')),index=await makeFontIndex(names,blur,fontFile),original=await createImageBitmap(await(await fetch('/res/IMG_8535.jpeg')).blob()),outputs=[];
 const plane=rectify?await rectifyPlane(original):null,image=plane?.canvas||original;
 try{for(const line of await findTitleStrips(image)){
  const strip=stripCanvas(image,line,{offset:-.04,height:.24,padding:0,right:0});const bands=await tightInkCrops(strip.canvas,{globalLevels:true});

  for(const band of bands){
   if(band.canvas.width/band.canvas.height<4||band.canvas.width<90)continue;
   const byName=new Map();
   for(const shear of [0])for(const hit of lookup(band.canvas,index,shear)){if(hit.score>(byName.get(hit.name)?.score??-1))byName.set(hit.name,{...hit,shear});}
   const candidates=[...byName.values()].sort((a,b)=>b.score-a.score).slice(0,5),poly=[[0,0],[band.canvas.width,0],[band.canvas.width,band.canvas.height],[0,band.canvas.height]].map(([x,y])=>strip.toImage(x+band.left,y+band.top));outputs.push({poly:plane?poly.map(p=>plane.toOriginal(...p)):poly,candidates});console.log('Font match',outputs.length,JSON.stringify(candidates.slice(0,2)));
  }
 }return{engine:'optical-font-matching',totalMs:performance.now()-start,plane:plane?{quad:plane.quad,matrix:plane.matrix,inverse:plane.inverse}:null,outputs};}finally{original.close();}
};
export {makeFontIndex,lookup};
