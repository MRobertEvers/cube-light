import './photo-scan.js';
import './edge-scan.js';
import {buildIndex,matchDetections} from './photo-match.js';
const $=id=>document.getElementById(id);
let url='/res/IMG_8535.jpeg',cancelled=false,busy=false,last=null;
const index=buildIndex(await(await fetch('/res/card-names.json')).json());
function setPhoto(next){if(url.startsWith('blob:'))URL.revokeObjectURL(url);url=next;$('photo').src=url;$('results').replaceChildren();$('overlay').replaceChildren();$('export').disabled=true;last=null;}
$('upload').onchange=()=>{const file=$('upload').files[0];if(file)setPhoto(URL.createObjectURL(file));};
$('sample').onclick=()=>setPhoto('/res/IMG_8535.jpeg');
function render(outputs){
 const candidates=matchDetections(outputs,index),accepted=candidates.filter(c=>c.status==='accepted');
 $('totals').textContent=`${accepted.length} accepted title locations · ${candidates.length-accepted.length} suggestions to review`;
 const fragment=document.createDocumentFragment(),overlay=document.createDocumentFragment();
 for(const c of candidates){
  const row=document.createElement('div');row.className=`evidence ${c.status}`;
  const badge=document.createElement('span');badge.className='badge';badge.textContent=c.status;
  const name=document.createElement('strong');name.textContent=c.name;
  const text=document.createElement('small');text.textContent=`Read: ${c.text} · name similarity ${(c.similarity*100).toFixed(0)}/100`;
  const crop=document.createElement('canvas');crop.width=Math.max(1,Math.ceil(c.box.w));crop.height=Math.max(1,Math.ceil(c.box.h));crop.getContext('2d').drawImage($('photo'),c.box.x,c.box.y,c.box.w,c.box.h,0,0,crop.width,crop.height);
  row.append(badge,name,text,crop);fragment.append(row);
  const polygon=document.createElementNS('http://www.w3.org/2000/svg','polygon');polygon.setAttribute('points',c.poly.map(p=>p.join(',')).join(' '));polygon.setAttribute('fill','none');polygon.setAttribute('stroke',c.status==='accepted'?'#99ffcb':'#ffc66f');polygon.setAttribute('stroke-width','5');overlay.append(polygon);
 }
 $('results').replaceChildren(fragment);$('overlay').setAttribute('viewBox',`0 0 ${$('photo').naturalWidth} ${$('photo').naturalHeight}`);$('overlay').replaceChildren(overlay);
 last={image:{width:$('photo').naturalWidth,height:$('photo').naturalHeight},candidates,warning:'Accepted means a heuristic passed, not verified probability. Hidden cards are not counted.'};$('export').disabled=false;
}
$('cancel').onclick=()=>{cancelled=true;$('status').textContent='Cancelling after the current OCR operation…';};
$('scan').onclick=async()=>{
 if(busy)return;busy=true;cancelled=false;const start=performance.now(),outputs=[];
 for(const id of ['scan','sample','upload','mode'])$(id).disabled=true;$('cancel').hidden=false;$('export').disabled=true;$('progress').removeAttribute('value');$('status').textContent='Loading OCR models…';
 try{
  await $('photo').decode();const mode=$('mode').value;
  const tiles=await window.scanPhoto({url,engine:mode==='tesseract'?'tesseract':'paddle',tileSize:960,overlap:200,detThresh:.1,boxThresh:.3,isCancelled:()=>cancelled,onProgress:e=>{$('status').textContent=`Reading tile ${e.completed}/${e.total}`;$('progress').value=e.completed/e.total*(mode==='hybrid'||mode==='server'?.65:1);}});
  outputs.push(...tiles.outputs);render(outputs);
  if(!cancelled&&(mode==='hybrid'||mode==='server')){
   $('status').textContent='Finding and straightening sleeve edges…';
   const edges=await window.scanEdges({url,engine:'direct',recModel:mode==='server'?'server':'small',isCancelled:()=>cancelled,onProgress:e=>{$('status').textContent=`Reading straightened title ${e.completed}/${e.total}`;$('progress').value=.65+.35*e.completed/e.total;}});
   outputs.push(...edges.outputs);render(outputs);
  }
  $('status').textContent=`${cancelled?'Stopped':'Finished'} in ${((performance.now()-start)/1000).toFixed(1)}s · review the evidence below`;if(!cancelled)$('progress').value=1;
 }catch(e){$('status').textContent=`Scan failed: ${e.message}`;}finally{busy=false;for(const id of ['scan','sample','upload','mode'])$(id).disabled=false;$('cancel').hidden=true;}
};
$('export').onclick=()=>{const link=document.createElement('a'),href=URL.createObjectURL(new Blob([JSON.stringify(last,null,2)],{type:'application/json'}));link.href=href;link.download='card-scan.json';link.click();setTimeout(()=>URL.revokeObjectURL(href),1000);};
