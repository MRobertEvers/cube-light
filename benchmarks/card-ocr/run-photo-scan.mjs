import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
const args=Object.fromEntries(process.argv.slice(2).map(v=>v.split('=')));
const config={ engine:args.engine||'paddle',model:args.model||'PP-OCRv6_small_rec',detector:args.detector||'PP-OCRv5_mobile_det',tileSize:Number(args.tile||1400),overlap:Number(args.overlap||300),scale:Number(args.scale||1),detThresh:Number(args.detThresh||0.3),boxThresh:Number(args.boxThresh||0.6) };
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try {
  const page=await browser.newPage();
  page.on('console',m=>{if(m.type()==='log') console.log(m.text());});
  page.on('pageerror',e=>console.error(e));
  await page.goto('http://127.0.0.1:4173/photo-scan.html');
  await page.waitForFunction(()=>typeof window.scanPhoto==='function');
  const result=await page.evaluate(config=>window.scanPhoto(config),config);
  await mkdir(new URL('./photo-results/',import.meta.url),{recursive:true});
  await writeFile(new URL(`./photo-results/${args.id||config.engine+'-'+config.tileSize}.json`,import.meta.url),JSON.stringify(result,null,2));
  console.log(JSON.stringify({ms:result.totalMs,items:result.outputs.reduce((n,o)=>n+o.items.length,0)}));
} finally {await browser.close();}
