import{getCV,findTitleStrips}from'./edge-titles.js';import{buildIndex,matchDetections}from'./photo-match.js';
export async function calibrateFont(plane,ocrOutputs,names){
 const font=await new FontFace('CalibratedTitle','url(/models/fonts/beleren.woff)').load();document.fonts.add(font);const{cv}=await getCV(),m=plane.matrix,transform=([x,y])=>[(m[0]*x+m[1]*y+m[2])/(m[6]*x+m[7]*y+m[8]),(m[3]*x+m[4]*y+m[5])/(m[6]*x+m[7]*y+m[8])],origin=transform(plane.quad[0]);
 const candidates=matchDetections(ocrOutputs,buildIndex(names)).filter(c=>c.status==='accepted').map(c=>({...c,p:c.poly.map(transform)}));
 const seed=candidates.find(c=>{const x=c.p.reduce((s,p)=>s+p[0]/4,0)-origin[0],y=c.p.reduce((s,p)=>s+p[1]/4,0)-origin[1];return x>0&&x<plane.cardWidth&&y>0&&y<plane.cardWidth*.2;});if(!seed)throw Error('Reference card title not independently recognized');
 const region={x:Math.floor(origin[0]),y:Math.floor(origin[1]),w:Math.ceil(plane.cardWidth*.88),h:Math.ceil(plane.cardWidth*.17)},c=document.createElement('canvas');c.width=region.w;c.height=region.h;c.getContext('2d').drawImage(plane.canvas,region.x,region.y,region.w,region.h,0,0,region.w,region.h);const rgba=cv.imread(c),gray=new cv.Mat();cv.cvtColor(rgba,gray,cv.COLOR_RGBA2GRAY);let best={score:-1};
 try{
  const measure=document.createElement('canvas').getContext('2d');measure.font='32px CalibratedTitle';const observedWidth=Math.hypot(seed.p[1][0]-seed.p[0][0],seed.p[1][1]-seed.p[0][1]),expectedSize=observedWidth/measure.measureText(seed.name).width*32,expectedCenter=seed.p.reduce((a,p)=>[a[0]+p[0]/4,a[1]+p[1]/4],[0,0]);
  for(let size=expectedSize*.8;size<=expectedSize*1.1;size+=.5){const t=document.createElement('canvas'),ctx=t.getContext('2d',{willReadFrequently:true});ctx.font=`${size}px CalibratedTitle`;const met=ctx.measureText(seed.name),ascent=Math.ceil(met.actualBoundingBoxAscent),descent=Math.ceil(met.actualBoundingBoxDescent);t.width=Math.ceil(met.width)+4;t.height=ascent+descent+4;if(t.width>=c.width||t.height>=c.height)continue;ctx.font=`${size}px CalibratedTitle`;ctx.fillStyle='white';ctx.fillRect(0,0,t.width,t.height);ctx.fillStyle='black';ctx.fillText(seed.name,2,ascent+2);const trgba=cv.imread(t),tg=new cv.Mat();cv.cvtColor(trgba,tg,cv.COLOR_RGBA2GRAY);
   for(const sigma of [.3,.7,1.1,1.6,2.2]){const blur=new cv.Mat(),scores=new cv.Mat();cv.GaussianBlur(tg,blur,new cv.Size(0,0),sigma,sigma);cv.matchTemplate(gray,blur,scores,cv.TM_CCOEFF_NORMED);for(let y=0;y<scores.rows;y++)for(let x=0;x<scores.cols;x++){
    if(Math.abs(x+region.x+t.width/2-expectedCenter[0])>12||Math.abs(y+region.y+t.height/2-expectedCenter[1])>8)continue;
    const score=scores.data32F[y*scores.cols+x];if(score>best.score)best={score,fontSize:size,blur:sigma,x:x+region.x,y:y+region.y,height:t.height,baseline:ascent+2};
   }blur.delete();scores.delete();}
   trgba.delete();tg.delete();
  }
  const edges=await findTitleStrips(plane.canvas),line=edges.filter(l=>Math.abs(l.angle)<.15&&l.length>plane.cardWidth*.6).sort((a,b)=>{const dist=l=>Math.abs(l.y1-origin[1])+Math.abs(l.x1-origin[0])*.5;return dist(a)-dist(b);})[0];
  return{...best,name:seed.name,origin,seedPoly:seed.p,left:best.x-origin[0],top:best.y-origin[1],cardWidth:plane.cardWidth,referenceLine:line};
 }finally{rgba.delete();gray.delete();}
}
window.calibrateExisting=async()=>{const{rectifyPlane}=await import('./rectify-plane.js'),image=await createImageBitmap(await(await fetch('/res/IMG_8535.jpeg')).blob()),plane=await rectifyPlane(image),r=await(await fetch('/photo-results/paddle-plane.json')).json(),names=await(await fetch('/res/card-names.json')).json();try{return await calibrateFont(plane,r.outputs,names);}finally{image.close();}};
