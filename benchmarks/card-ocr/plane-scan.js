import{rectifyPlane}from'./rectify-plane.js';import{scanPhoto}from'./photo-scan.js';
window.scanPlane=async()=>{
 const start=performance.now(),image=await createImageBitmap(await(await fetch('/res/IMG_8535.jpeg')).blob());let url;
 try{const plane=await rectifyPlane(image);url=URL.createObjectURL(await new Promise(r=>plane.canvas.toBlob(r,'image/png')));const result=await scanPhoto({url,tileSize:960,overlap:200,detThresh:.1,boxThresh:.3});for(const out of result.outputs)for(const item of out.items)item.poly=item.poly.map(p=>plane.toOriginal(...p));return{...result,engine:'paddle-plane',totalMs:performance.now()-start,plane:{quad:plane.quad,matrix:plane.matrix,inverse:plane.inverse}};}finally{image.close();if(url)URL.revokeObjectURL(url);}
};
