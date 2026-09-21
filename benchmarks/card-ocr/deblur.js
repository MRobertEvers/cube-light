// Regularized Richardson–Lucy deconvolution. No synthesized letters or card prior.
export function deblurImageData(pixels,sigma=2,iterations=12){
 const {width:w,height:h,data}=pixels,n=w*h,r=Math.ceil(sigma*3),kernel=[];
 let total=0;for(let i=-r;i<=r;i++){const v=Math.exp(-i*i/(2*sigma*sigma));kernel.push(v);total+=v;}for(let i=0;i<kernel.length;i++)kernel[i]/=total;
 const temp=new Float32Array(n);
 const blur=(input,out)=>{
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){let s=0;for(let d=-r;d<=r;d++)s+=input[y*w+Math.max(0,Math.min(w-1,x+d))]*kernel[d+r];temp[y*w+x]=s;}
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){let s=0;for(let d=-r;d<=r;d++)s+=temp[Math.max(0,Math.min(h-1,y+d))*w+x]*kernel[d+r];out[y*w+x]=s;}
 };
 const original=new Float32Array(n);for(let i=0;i<n;i++)original[i]=(.299*data[i*4]+.587*data[i*4+1]+.114*data[i*4+2])/255;
 const estimate=original.slice(),smooth=new Float32Array(n),ratio=new Float32Array(n),correction=new Float32Array(n);
 for(let k=0;k<iterations;k++){blur(estimate,smooth);for(let i=0;i<n;i++)ratio[i]=Math.min(3,(original[i]+.003)/(smooth[i]+.003));blur(ratio,correction);for(let i=0;i<n;i++)estimate[i]=Math.max(.001,Math.min(1.2,estimate[i]*correction[i]));}
 for(let i=0;i<n;i++)data[i*4]=data[i*4+1]=data[i*4+2]=Math.round(Math.min(255,estimate[i]*255));return pixels;
}
