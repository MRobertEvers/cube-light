import{findTitleStrips}from'./edge-titles.js';import{createRecognizer}from'./direct-recognizer.js';
window.diagnoseCrops=async({boxes,model='small'})=>{
 const image=await createImageBitmap(await(await fetch('/res/IMG_8535.jpeg')).blob()),lines=await findTitleStrips(image),worker=await createRecognizer(model),outputs=[];
 try{for(const {id,box:[x,y,w,h]}of boxes){
  const cx=x+w/2,cy=y+h/2,near=[...lines].sort((a,b)=>{const dist=l=>{const yc=l.y1+(cx-l.x1)*Math.tan(l.angle);return Math.abs(cy-yc)+Math.max(0,l.x1-cx,cx-l.x2)*2;};return dist(a)-dist(b);})[0],angle=near.angle,c=Math.cos(angle),s=Math.sin(angle),hh=Math.max(15,h-w*Math.abs(Math.tan(angle))+8),ww=w/c;
  const input=document.createElement('canvas');input.width=ww*2;input.height=hh*2;const ctx=input.getContext('2d');ctx.translate(input.width/2,input.height/2);ctx.scale(2,2);ctx.rotate(-angle);ctx.translate(-cx,-cy);ctx.drawImage(image,0,0);
  const result=await worker.recognize(input);outputs.push({id,text:result.text,score:result.score,angle,width:input.width,height:input.height,crop:input.toDataURL()});console.log(id,result.text);
 }return outputs;}finally{image.close();worker.dispose();}
};
