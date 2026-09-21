import { createWorker } from 'tesseract.js';
import { PaddleOCR } from '@paddleocr/paddleocr-js';
import { bestCardName, prepareNames } from './match-card-name.js';

window.runWorkerModeSmoke = async () => {
  const worker = await PaddleOCR.create({
    worker: true,
    textDetectionModelName: 'PP-OCRv5_mobile_det',
    textRecognitionModelName: 'PP-OCRv5_mobile_rec',
    ortOptions: { backend: 'wasm', numThreads: 1, simd: true }
  });
  try {
    const image = await loadImage('/images/00.jpg');
    const [result] = await worker.predict(image);
    return result.items.map(item => item.text);
  } finally {
    await worker.dispose();
  }
};

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Cannot load ${url}`));
    img.src = url;
  });
}

function titleCrop(image, tight = false) {
  const canvas = document.createElement('canvas');
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const x = Math.round(width * (tight ? 0.065 : 0.055));
  const y = Math.round(height * (tight ? 0.043 : 0.035));
  const w = Math.round(width * (tight ? 0.75 : 0.825));
  const h = Math.round(height * (tight ? 0.05 : 0.085));
  const scale = tight ? Math.round(1464 / width) : 3;
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, x, y, w, h, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function halfResolution(image) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.naturalWidth / 2);
  canvas.height = Math.round(image.naturalHeight / 2);
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function syntheticPhoto(image) {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 800;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#bbb9b3';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(4 * Math.PI / 180);
  ctx.filter = 'blur(0.65px) brightness(0.88) contrast(0.9)';
  ctx.drawImage(image, -207, -289, 414, 578);
  return canvas;
}

window.runBenchmark = async (manifest, engine, mode = 'crop') => {
  const start = performance.now();
  let worker;
  if (engine === 'tesseract') worker = await createWorker('eng');
  else worker = await PaddleOCR.create({
    textDetectionModelName: 'PP-OCRv5_mobile_det',
    textRecognitionModelName: 'PP-OCRv5_mobile_rec',
    ortOptions: { backend: 'wasm', numThreads: 2, simd: true }
  });
  const loadMs = performance.now() - start;
  if (engine === 'tesseract' && !['crop', 'full', 'photo'].includes(mode)) {
    await worker.setParameters({ tessedit_pageseg_mode: '7' });
  }
  const results = [];
  for (const item of manifest) {
    const image = await loadImage(`/images/${item.file}`);
    const input = mode === 'full' ? image
      : mode === 'photo' ? syntheticPhoto(image)
      : mode === 'crop' ? titleCrop(image)
      : mode === 'small' ? titleCrop(halfResolution(image), true)
      : titleCrop(image, true);
    const t0 = performance.now();
    const output = engine === 'tesseract'
      ? (await worker.recognize(input)).data.text
      : (await worker.predict(input))[0].items.map(x => x.text).join(' | ');
    results.push({ name: item.name, output: output.trim(), ms: performance.now() - t0 });
  }
  await worker.terminate?.();
  await worker.dispose?.();
  return { engine, mode, loadMs, results };
};

window.runMultiCard = async (engine, tiled = false) => {
  const image = await loadImage('/res/multi-card.jpg');
  const loadStart = performance.now();
  const worker = engine === 'tesseract' ? await createWorker('eng') : await PaddleOCR.create({
    textDetectionModelName: 'PP-OCRv5_mobile_det',
    textRecognitionModelName: 'PP-OCRv5_mobile_rec',
    ortOptions: { backend: 'wasm', numThreads: 2, simd: true }
  });
  const loadMs = performance.now() - loadStart;
  const regions = tiled ? [] : [{ x: 0, y: 0, w: image.naturalWidth, h: image.naturalHeight }];
  if (tiled) {
    for (const y of [0, 700, 1400]) {
      for (const x of [0, 800, 1600, 2400]) {
        regions.push({ x, y, w: Math.min(1000, image.naturalWidth - x), h: Math.min(900, image.naturalHeight - y) });
      }
    }
  }
  const outputs = [];
  for (const region of regions) {
    const canvas = document.createElement('canvas');
    canvas.width = region.w;
    canvas.height = region.h;
    canvas.getContext('2d').drawImage(image, region.x, region.y, region.w, region.h, 0, 0, region.w, region.h);
    const start = performance.now();
    const result = engine === 'tesseract' ? await worker.recognize(canvas) : (await worker.predict(canvas))[0];
    outputs.push({ region, ms: performance.now() - start, text: engine === 'tesseract' ? result.data.text : undefined,
      items: engine === 'paddle' ? result.items : undefined });
  }
  await worker.terminate?.();
  await worker.dispose?.();
  return { engine, tiled, loadMs, outputs };
};

window.runMultiTitles = async (engine, truth, onProgress) => {
  const image = await loadImage('/res/multi-card.jpg');
  const loadStart = performance.now();
  const worker = engine === 'tesseract' ? await createWorker('eng') : await PaddleOCR.create({
    worker: Boolean(onProgress),
    textDetectionModelName: 'PP-OCRv5_mobile_det',
    textRecognitionModelName: 'PP-OCRv5_mobile_rec',
    ortOptions: { backend: 'wasm', numThreads: 2, simd: true }
  });
  if (engine === 'tesseract') await worker.setParameters({ tessedit_pageseg_mode: '7' });
  const loadMs = performance.now() - loadStart;
  onProgress?.({ phase: 'model-ready', total: truth.length });
  const outputs = [];
  for (const item of truth) {
    if (onProgress) {
      onProgress({ phase: 'analyzing', processed: outputs.length, total: truth.length, item });
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
    const [x, y, w, h] = item.box;
    const canvas = document.createElement('canvas');
    canvas.width = w * 3;
    canvas.height = h * 3;
    canvas.getContext('2d').drawImage(image, x, y, w, h, 0, 0, canvas.width, canvas.height);
    const start = performance.now();
    const result = engine === 'tesseract' ? (await worker.recognize(canvas)).data.text
      : (await worker.predict(canvas))[0].items;
    const sortedItems = engine !== 'tesseract'
      ? result.slice().sort((a, b) => a.poly[0][0] - b.poly[0][0]) : undefined;
    const output = { ...item,
      output: engine === 'tesseract' ? result.trim() : sortedItems.map(x => x.text).join(' ').trim(),
      items: sortedItems,
      ms: performance.now() - start };
    outputs.push(output);
    onProgress?.({ phase: 'card', processed: outputs.length, total: truth.length, item: output });
  }
  await worker.terminate?.();
  await worker.dispose?.();
  return { engine, loadMs, outputs };
};

const runButton = document.getElementById('run');
if (runButton) {
  const photo = document.getElementById('photo');
  const scanBox = document.getElementById('scan-box');
  const scanLabel = document.getElementById('scan-label');
  let activeRegion = null;
  const placeScanBox = () => {
    if (!activeRegion || !photo.naturalWidth) return;
    const [x, y, width, height] = activeRegion.box;
    const bounds = photo.getBoundingClientRect();
    const scale = Math.min(bounds.width / photo.naturalWidth, bounds.height / photo.naturalHeight);
    const leftInset = (bounds.width - photo.naturalWidth * scale) / 2;
    const topInset = (bounds.height - photo.naturalHeight * scale) / 2;
    const visualHeight = Math.max(height * scale, 18);
    scanBox.style.left = `${leftInset + x * scale}px`;
    scanBox.style.top = `${topInset + y * scale - (visualHeight - height * scale) / 2}px`;
    scanBox.style.width = `${width * scale}px`;
    scanBox.style.height = `${visualHeight}px`;
  };
  window.addEventListener('resize', placeScanBox);
  runButton.addEventListener('click', async () => {
    runButton.disabled = true;
    const progress = document.getElementById('progress');
    const status = document.getElementById('status');
    const list = document.getElementById('results');
    list.replaceChildren();
    progress.removeAttribute('value');
    activeRegion = null;
    scanBox.hidden = true;
    status.textContent = 'Loading PaddleOCR model…';
    let identified = 0;
    try {
      const [truth, names] = await Promise.all([
        fetch('/multi-ground-truth.json').then(response => response.json()),
        fetch('/res/card-names.json').then(response => response.json())
      ]);
      const preparedNames = prepareNames(names);
      await window.runMultiTitles('paddle', truth, event => {
        if (event.phase === 'model-ready') {
          progress.value = 0;
          status.textContent = `Model ready. Processed 0/${event.total} titles; 0 confirmed.`;
        } else if (event.phase === 'analyzing') {
          activeRegion = event.item;
          scanBox.hidden = false;
          scanBox.dataset.cardIndex = String(event.processed + 1);
          scanLabel.textContent = `Title ${event.processed + 1}/${event.total}`;
          placeScanBox();
          status.textContent = `Analyzing title ${event.processed + 1}/${event.total}; ${event.processed} processed, ${identified} identified.`;
        } else {
          const suggestion = bestCardName(event.item.output, preparedNames);
          const match = suggestion?.name === event.item.name && suggestion.score >= 80;
          if (match) identified++;
          progress.value = event.processed;
          status.textContent = `Processed ${event.processed}/${event.total} titles; ${identified} correct high-confidence suggestions.`;
          const row = document.createElement('li');
          row.className = match ? 'hit' : 'miss';
          const title = document.createElement('strong');
          title.textContent = `Expected: ${event.item.name}`;
          const observed = document.createElement('small');
          observed.textContent = `OCR: ${event.item.output || '(nothing detected)'} · Suggestion: ${suggestion ? `${suggestion.name} (${suggestion.score.toFixed(0)})` : 'none'}`;
          row.append(title, observed);
          list.append(row);
        }
      });
    } catch (error) {
      status.textContent = `Benchmark failed: ${error}`;
    } finally {
      activeRegion = null;
      scanBox.hidden = true;
      runButton.disabled = false;
    }
  });
}
