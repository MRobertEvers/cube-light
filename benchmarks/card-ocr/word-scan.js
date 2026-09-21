import{getCV}from'./edge-titles.js';import{createRecognizer}from'./direct-recognizer.js';
export function wordSlices(canvas){
 const{width:w,height:h}=canvas,p=canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,w,h).data,ink=new Float32Array(w);
 for(let y=Math.floor(h*.15);y<h*.85;y++){const row=[];for(let x=0;x<w;x++){const i=(y*w+x)*4;row.push(.299*p[i]+.587*p[i+1]+.114*p[i+2]);}const sorted=[...row].sort((a,b)=>a-b),bg=sorted[Math.floor(w*.85)];for(let x=0;x<w;x++)ink[x]+=Math.max(0,bg-row[x]);}
 const smooth=Array.from(ink,(_,x)=>(ink[Math.max(0,x-1)]+ink[x]+ink[Math.min(w-1,x+1)])/3),max=Math.max(...smooth),gaps=[];let start=0;
 for(let x=0;x<=w;x++){if(x<w&&smooth[x]<max*.18)continue;if(x-start>=Math.max(2,h*.10)&&start>w*.15&&x<w*.85)gaps.push({x:(start+x)/2,width:x-start});start=x+1;}
 gaps.sort((a,b)=>b.width-a.width);const split=gaps[0]?.x;
 if(!split)return[];
 const limits=[[0,Math.ceil(split)],[Math.floor(split),w]];
 return limits.map(([x,end])=>{const c=document.createElement('canvas');c.width=end-x+8;c.height=h+8;const ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(canvas,x,0,end-x,h,4,4,end-x,h);return c;});
}
window.scanWords=async()=>{
 const start=performance.now(),files=['font-proposals-v2','font-lightband-v3','font-plane-v7','font-bands-v6'],all=(await Promise.all(files.map(f=>fetch(`/photo-results/${f}.json`).then(r=>r.json())))).flatMap(r=>r.outputs),keys=new Set(),regions=[];
 for(const r of all){const n=r.candidates[0];if(!n||n.score<.32||n.name.includes('_')||n.name.replace(/[^a-z]/gi,'').length<8)continue;const key=r.poly.flat().map(v=>Math.round(v/6)).join(',');if(keys.has(key))continue;keys.add(key);regions.push(r);}
 const{cv}=await getCV(),image=await createImageBitmap(await(await fetch('/res/IMG_8535.jpeg')).blob()),c=document.createElement('canvas');c.width=image.width;c.height=image.height;c.getContext('2d').drawImage(image,0,0);const src=cv.imread(c),worker=await createRecognizer('small'),outputs=[];
 try{for(const r of regions){const w=Math.max(10,Math.round(Math.hypot(r.poly[1][0]-r.poly[0][0],r.poly[1][1]-r.poly[0][1])*2)),h=Math.max(10,Math.round(Math.hypot(r.poly[3][0]-r.poly[0][0],r.poly[3][1]-r.poly[0][1])*2)),from=cv.matFromArray(4,1,cv.CV_32FC2,r.poly.flat()),to=cv.matFromArray(4,1,cv.CV_32FC2,[4,4,w+4,4,w+4,h+4,4,h+4]),M=cv.getPerspectiveTransform(from,to),out=new cv.Mat();cv.warpPerspective(src,out,M,new cv.Size(w+8,h+8),cv.INTER_CUBIC,cv.BORDER_REPLICATE);const crop=document.createElement('canvas');cv.imshow(crop,out);const slices=wordSlices(crop);let text='',score=0;
  if(slices.length){const results=[];for(const slice of slices)results.push(await worker.recognize(slice));text=results.map(r=>r.text).join(' ');score=Math.min(...results.map(r=>r.score));}
  outputs.push({candidates:r.candidates,items:[{text,score,poly:r.poly}]});if(text.length>6)console.log('Words',outputs.length,text);for(const m of[from,to,M,out])m.delete();
 }return{engine:'word-split-paddle',totalMs:performance.now()-start,outputs};}finally{worker.dispose();image.close();src.delete();}
};
