import cvModule from "@techstark/opencv-js";
let ready;
export async function getCV() {
  return (ready ||= (async () => {
    const cv = cvModule instanceof Promise ? await cvModule : cvModule;
    if (!cv.Mat) await new Promise((r) => (cv.onRuntimeInitialized = r));
    return { cv };
  })());
}
export async function findTitleStrips(image, {saturation=125, value=100, hueLow=3, hueHigh=30}={}) {
  const { cv } = await getCV(),
    scale = Math.min(1, 2200 / image.width);
  const canvas = document.createElement("canvas");
  canvas.width = image.width * scale;
  canvas.height = image.height * scale;
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  const src = cv.imread(canvas),
    rgb = new cv.Mat(),
    hsv = new cv.Mat(),
    mask = new cv.Mat(),
    edges = new cv.Mat(),
    lines = new cv.Mat();
  let lo, hi;
  try {
    cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB);
    cv.cvtColor(rgb, hsv, cv.COLOR_RGB2HSV);
    lo = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [hueLow, saturation, value, 0]);
    hi = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [hueHigh, 255, 255, 255]);
    cv.inRange(hsv, lo, hi, mask);
    cv.Canny(mask, edges, 50, 150);
    cv.HoughLinesP(edges, lines, 1, Math.PI / 720, 25, 38, 9);
    const candidates = [];
    for (let i = 0; i < lines.rows; i++) {
      let [x1, y1, x2, y2] = lines.data32S.slice(i * 4, i * 4 + 4);
      if (x1 > x2) [x1, y1, x2, y2] = [x2, y2, x1, y1];
      let length = Math.hypot(x2 - x1, y2 - y1);
      const angle = Math.atan2(y2 - y1, x2 - x1);
      if (length < 45 || length > canvas.width * 0.4 || Math.abs(angle) > 0.65)
        continue;
      candidates.push({ x1, y1, x2, y2, length, angle });
    }
    const kept = [];
    for (const line of candidates.sort((a, b) => b.length - a.length)) {
      if (
        kept.some(
          (k) =>
            Math.abs(k.angle - line.angle) < 0.06 &&
            Math.abs(
              (line.y1 - k.y1) * Math.cos(k.angle) -
                (line.x1 - k.x1) * Math.sin(k.angle),
            ) < 10 &&
            line.x1 < k.x2 + 15 &&
            line.x2 > k.x1 - 15,
        )
      )
        continue;
      kept.push(line);
    }
    return kept.map((l) => ({
      ...l,
      x1: l.x1 / scale,
      y1: l.y1 / scale,
      x2: l.x2 / scale,
      y2: l.y2 / scale,
      length: l.length / scale,
    }));
  } finally {
    for (const m of [src, rgb, hsv, mask, edges, lines, lo, hi]) m?.delete();
  }
}
export function stripCanvas(
  image,
  line,
  { offset = 0.055, height = 0.06, padding = 0.04, right = 0.12 } = {},
) {
  // Read below each edge. Full card width is never supplied by annotations.
  const width = line.length,
    h = Math.max(16, width * height),
    top = width * offset;
  const factor = 2,
    canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width * (1 - padding - right) * factor);
  canvas.height = Math.ceil(h * factor);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(factor, factor);
  ctx.translate(-width * padding, -top);
  ctx.rotate(-line.angle);
  ctx.translate(-line.x1, -line.y1);
  ctx.drawImage(image, 0, 0);
  const c = Math.cos(line.angle),
    s = Math.sin(line.angle);
  const toImage = (x, y) => [line.x1 + c * x - s * y, line.y1 + s * x + c * y];
  return {
    canvas,
    poly: [
      toImage(width * padding, top),
      toImage(width * (1 - right), top),
      toImage(width * (1 - right), top + h),
      toImage(width * padding, top + h),
    ],
    toImage: (x, y) => toImage(x / factor + width * padding, y / factor + top),
  };
}

export function trimTitleBand(input) {
  const ctx = input.getContext("2d", { willReadFrequently: true }),
    { width: w, height: h } = input,
    pixels = ctx.getImageData(0, 0, w, h).data;
  const rows = [];
  for (let y = 0; y < h; y++) {
    let sum = 0,
      n = 0;
    for (let x = Math.floor(w * 0.12); x < w * 0.78; x++) {
      const i = (y * w + x) * 4;
      sum += 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
      n++;
    }
    rows.push(sum / Math.max(1, n));
  }
  const smooth = rows.map(
    (_, y) =>
      rows
        .slice(Math.max(0, y - 2), Math.min(h, y + 3))
        .reduce((a, b) => a + b, 0) /
      (Math.min(h, y + 3) - Math.max(0, y - 2)),
  );
  const lo = Math.min(...smooth),
    hi = Math.max(...smooth),
    threshold = lo + (hi - lo) * 0.6;
  let start = 0,
    best = null;
  for (let y = 0; y <= h; y++) {
    if (y < h && smooth[y] >= threshold) continue;
    if (y - start >= 8 && y - start < h * 0.8) {
      const strength =
        smooth.slice(start, y).reduce((a, b) => a + b, 0) / (y - start);
      if (!best || strength > best.strength)
        best = { top: start, bottom: y, strength };
    }
    start = y + 1;
  }
  if (!best || hi - lo < 25) return { canvas: input, top: 0, left: 0, pad: 0 };
  const left = Math.round(w * 0.02),
    right = Math.round(w * 0.97),
    top = Math.max(0, best.top - 2),
    bottom = Math.min(h, best.bottom + 2),
    pad = 10;
  const canvas = document.createElement("canvas");
  canvas.width = right - left + pad * 2;
  canvas.height = bottom - top + pad * 2;
  const target = canvas.getContext("2d");
  target.fillStyle = "white";
  target.fillRect(0, 0, canvas.width, canvas.height);
  target.drawImage(
    input,
    left,
    top,
    right - left,
    bottom - top,
    pad,
    pad,
    right - left,
    bottom - top,
  );
  return { canvas, top, left, pad };
}

// Locate ink components inside a rectified strip; discard the connected dark frame.
export async function tightInkCrops(input,{allowTall=false,globalLevels=false}={}){
 const {cv}=await getCV(),src=cv.imread(input),gray=new cv.Mat(),binary=new cv.Mat(),contours=new cv.MatVector(),hier=new cv.Mat();
 try{
  cv.cvtColor(src,gray,cv.COLOR_RGBA2GRAY);
  const regions=[];
  for(const threshold of (globalLevels?[45,65,85,105,125,145,165,185,205]:[4,10,18])){
   if(globalLevels)cv.threshold(gray,binary,threshold,255,cv.THRESH_BINARY_INV);else cv.adaptiveThreshold(gray,binary,255,cv.ADAPTIVE_THRESH_GAUSSIAN_C,cv.THRESH_BINARY_INV,31,threshold);
   cv.findContours(binary,contours,hier,cv.RETR_EXTERNAL,cv.CHAIN_APPROX_SIMPLE);
   const parts=[];
   for(let i=0;i<contours.size();i++){const contour=contours.get(i),r=cv.boundingRect(contour);contour.delete();
    if(r.x<=1||(!allowTall&&r.y<=1)||r.x+r.width>=src.cols-2||(!allowTall&&r.y+r.height>=src.rows-2)||r.height<8||r.height>src.rows*(allowTall?1:.7)||r.width<2||r.width>src.cols*.8)continue;parts.push(r);
   }
   for(const seed of parts){
    const same=parts.filter(p=>Math.abs(p.y+p.height/2-seed.y-seed.height/2)<Math.max(p.height,seed.height)*.45&&p.height>seed.height*.35&&p.height<seed.height*2.5);
    if(!same.length)continue;
    const sorted=[...same].sort((a,b)=>a.x-b.x),groups=[];let current=[];
    for(const part of sorted){if(current.length){const last=current.at(-1),gap=part.x-last.x-last.width;if(gap>Math.max(10,Math.max(last.height,part.height)*.8)){groups.push(current);current=[];}}current.push(part);}if(current.length)groups.push(current);
    for(const same of groups){
    const x=Math.min(...same.map(p=>p.x)),y=Math.min(...same.map(p=>p.y)),right=Math.max(...same.map(p=>p.x+p.width)),bottom=Math.max(...same.map(p=>p.y+p.height));
    if(right-x<(bottom-y)*2.5)continue;
    const r={x:Math.max(0,x-2),y:Math.max(0,y-2),w:Math.min(input.width-x+2,right-x+4),h:Math.min(input.height-y+2,bottom-y+4),parts:same.length};
    if(regions.some(a=>Math.abs(a.x-r.x)<5&&Math.abs(a.y-r.y)<5&&Math.abs(a.w-r.w)<10&&Math.abs(a.h-r.h)<5))continue;
    regions.push(r);
    }
   }
  }
  return regions.sort((a,b)=>b.parts-a.parts).slice(0,globalLevels?8:3).map(r=>{const c=document.createElement('canvas');c.width=r.w;c.height=r.h;c.getContext('2d').drawImage(input,r.x,r.y,r.w,r.h,0,0,r.w,r.h);return{canvas:c,left:r.x,top:r.y,pad:0};});
 }finally{for(const m of[src,gray,binary,contours,hier])m.delete();}
}

// A high row quantile follows the light title background without cutting through dark letters.
export function lightTitleBand(input){
 const {width:w,height:h}=input,ctx=input.getContext('2d',{willReadFrequently:true}),p=ctx.getImageData(0,0,w,h).data,rows=[];
 for(let y=0;y<h;y++){const v=[];for(let x=Math.floor(w*.1);x<w*.85;x+=2){const i=(y*w+x)*4;v.push(.299*p[i]+.587*p[i+1]+.114*p[i+2]);}v.sort((a,b)=>a-b);rows.push(v[Math.floor(v.length*.8)]||0);}
 const lo=Math.min(...rows),hi=Math.max(...rows),threshold=lo+(hi-lo)*.72,runs=[];let from=0;
 for(let y=0;y<=h;y++){if(y<h&&rows[y]>=threshold)continue;if(y-from>=10&&y-from<h*.85)runs.push({y:from,h:y-from});from=y+1;}
 return runs.sort((a,b)=>b.h-a.h).slice(0,2).map(r=>{const canvas=document.createElement('canvas');canvas.width=w;canvas.height=r.h;canvas.getContext('2d').drawImage(input,0,r.y,w,r.h,0,0,w,r.h);return{canvas,left:0,top:r.y,pad:0};});
}

export async function mserInkCrops(input){
 const{cv}=await getCV(),src=cv.imread(input),gray=new cv.Mat(),regions=new cv.MatVector(),boxes=new cv.RectVector(),detector=new cv.MSER();
 try{
  cv.cvtColor(src,gray,cv.COLOR_RGBA2GRAY);detector.setDelta(2);detector.setMinArea(10);detector.setMaxArea(Math.floor(input.width*input.height*.4));detector.detectRegions(gray,regions,boxes);
  const parts=[];for(let i=0;i<regions.size();i++){const m=regions.get(i),r=cv.boundingRect(m);m.delete();if(r.height<7||r.height>input.height*.65||r.width<2||r.width>input.width*.75)continue;if(parts.some(p=>Math.abs(p.x-r.x)<3&&Math.abs(p.y-r.y)<3&&Math.abs(p.width-r.width)<5&&Math.abs(p.height-r.height)<4))continue;parts.push(r);}
  const rows=[];for(const seed of parts){const same=parts.filter(p=>Math.abs(p.y+p.height/2-seed.y-seed.height/2)<Math.max(p.height,seed.height)*.4&&p.height>seed.height*.5&&p.height<seed.height*2).sort((a,b)=>a.x-b.x);let group=[],groups=[];for(const p of same){if(group.length&&p.x-Math.max(...group.map(r=>r.x+r.width))>seed.height*.9){groups.push(group);group=[];}group.push(p);}if(group.length)groups.push(group);
   for(const group of groups){const x=Math.min(...group.map(p=>p.x)),y=Math.min(...group.map(p=>p.y)),w=Math.max(...group.map(p=>p.x+p.width))-x,h=Math.max(...group.map(p=>p.y+p.height))-y;if(w/h<4||w<80)continue;if(rows.some(r=>Math.abs(r.x-x)<5&&Math.abs(r.y-y)<4&&Math.abs(r.w-w)<10&&Math.abs(r.h-h)<5))continue;rows.push({x,y,w,h,count:group.length});}
  }
  return rows.sort((a,b)=>b.count-a.count).slice(0,6).map(r=>{const canvas=document.createElement('canvas');canvas.width=r.w+4;canvas.height=r.h+4;canvas.getContext('2d').drawImage(input,r.x-2,r.y-2,r.w+4,r.h+4,0,0,r.w+4,r.h+4);return{canvas,left:r.x-2,top:r.y-2,pad:0};});
 }finally{for(const m of[src,gray,regions,boxes,detector])m.delete();}
}
