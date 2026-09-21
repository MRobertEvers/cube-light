import cvModule from '@techstark/opencv-js';
let ready;
async function getCV(){return ready ||= (async()=>{const cv=cvModule instanceof Promise?await cvModule:cvModule;if(!cv.Mat)await new Promise(r=>cv.onRuntimeInitialized=r);return {cv};})();}
export async function findTitleStrips(image) {
  const {cv}=await getCV(),scale=Math.min(1,2200/image.width);
  const canvas=document.createElement('canvas');canvas.width=image.width*scale;canvas.height=image.height*scale;
  canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
  const src=cv.imread(canvas),rgb=new cv.Mat(),hsv=new cv.Mat(),mask=new cv.Mat(),edges=new cv.Mat(),lines=new cv.Mat();
  let lo,hi;
  try {
    cv.cvtColor(src,rgb,cv.COLOR_RGBA2RGB);cv.cvtColor(rgb,hsv,cv.COLOR_RGB2HSV);
    lo=new cv.Mat(hsv.rows,hsv.cols,hsv.type(),[3,125,100,0]);hi=new cv.Mat(hsv.rows,hsv.cols,hsv.type(),[30,255,255,255]);
    cv.inRange(hsv,lo,hi,mask);cv.Canny(mask,edges,50,150);
    cv.HoughLinesP(edges,lines,1,Math.PI/720,25,38,9);
    const candidates=[];
    for(let i=0;i<lines.rows;i++){
      let [x1,y1,x2,y2]=lines.data32S.slice(i*4,i*4+4);if(x1>x2)[x1,y1,x2,y2]=[x2,y2,x1,y1];
      let length=Math.hypot(x2-x1,y2-y1);const angle=Math.atan2(y2-y1,x2-x1);
      if(length<45||length>canvas.width*.4||Math.abs(angle)>.65)continue;
      candidates.push({x1,y1,x2,y2,length,angle});
    }
    const kept=[];
    for(const line of candidates.sort((a,b)=>b.length-a.length)){
      if(kept.some(k=>Math.abs(k.angle-line.angle)<.06&&Math.abs((line.y1-k.y1)*Math.cos(k.angle)-(line.x1-k.x1)*Math.sin(k.angle))<10&&line.x1<k.x2+15&&line.x2>k.x1-15))continue;
      kept.push(line);
    }
    return kept.map(l=>({...l,x1:l.x1/scale,y1:l.y1/scale,x2:l.x2/scale,y2:l.y2/scale,length:l.length/scale}));
  } finally{for(const m of [src,rgb,hsv,mask,edges,lines,lo,hi])m?.delete();}
}
export function stripCanvas(image,line,{offset=.055,height=.06,padding=.04,right=.12}={}) {
  // Read below each edge. Full card width is never supplied by annotations.
  const width=line.length, h=Math.max(16,width*height),top=width*offset;
  const factor=2,canvas=document.createElement('canvas');canvas.width=Math.ceil(width*(1-padding-right)*factor);canvas.height=Math.ceil(h*factor);
  const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.scale(factor,factor);ctx.translate(-width*padding,-top);ctx.rotate(-line.angle);ctx.translate(-line.x1,-line.y1);ctx.drawImage(image,0,0);
  const c=Math.cos(line.angle),s=Math.sin(line.angle);
  const toImage=(x,y)=>[line.x1+c*x-s*y,line.y1+s*x+c*y];
  return {canvas,poly:[toImage(width*padding,top),toImage(width*(1-right),top),toImage(width*(1-right),top+h),toImage(width*padding,top+h)],toImage:(x,y)=>toImage(x/factor+width*padding,y/factor+top)};
}

export function trimTitleBand(input){
 const ctx=input.getContext('2d',{willReadFrequently:true}),{width:w,height:h}=input,pixels=ctx.getImageData(0,0,w,h).data;
 const rows=[];for(let y=0;y<h;y++){let sum=0,n=0;for(let x=Math.floor(w*.12);x<w*.78;x++){const i=(y*w+x)*4;sum+=.299*pixels[i]+.587*pixels[i+1]+.114*pixels[i+2];n++;}rows.push(sum/Math.max(1,n));}
 const smooth=rows.map((_,y)=>rows.slice(Math.max(0,y-2),Math.min(h,y+3)).reduce((a,b)=>a+b,0)/(Math.min(h,y+3)-Math.max(0,y-2)));
 const lo=Math.min(...smooth),hi=Math.max(...smooth),threshold=lo+(hi-lo)*.6;
 let start=0,best=null;
 for(let y=0;y<=h;y++){
  if(y<h&&smooth[y]>=threshold)continue;
  if(y-start>=8&&y-start<h*.8){const strength=smooth.slice(start,y).reduce((a,b)=>a+b,0)/(y-start);if(!best||strength>best.strength)best={top:start,bottom:y,strength};}
  start=y+1;
 }
 if(!best||hi-lo<25)return {canvas:input,top:0,left:0,pad:0};
 const left=Math.round(w*.02),right=Math.round(w*.97),top=Math.max(0,best.top-2),bottom=Math.min(h,best.bottom+2),pad=10;
 const canvas=document.createElement('canvas');canvas.width=right-left+pad*2;canvas.height=bottom-top+pad*2;
 const target=canvas.getContext('2d');target.fillStyle='white';target.fillRect(0,0,canvas.width,canvas.height);target.drawImage(input,left,top,right-left,bottom-top,pad,pad,right-left,bottom-top);
 return{canvas,top,left,pad};
}
