// One shard of the printed-title index: renders its slice of the catalog in the card
// title font and ranks those names against title crops. See platform/card-scanner/font-ocr.js.
import type { ShardMatch, TitleIndexRequest, TitleIndexResponse } from './title-index.protocol';

const W = 96,
	H = 16,
	D = W * H,
	SHORTLIST = 100;

let offset = 0,
	count = 0,
	features = new Float32Array(0),
	projections = new Float32Array(0);

function post(message: TitleIndexResponse) {
	(self as unknown as Worker).postMessage(message);
}

async function build(names: string[], blur: number, fontUrl: string) {
	const font = await new FontFace('OCRFont', `url(${fontUrl})`).load();
	(self as unknown as WorkerGlobalScope).fonts.add(font);
	const text = new OffscreenCanvas(1, 1),
		ctx = text.getContext('2d', { willReadFrequently: true })!,
		cell = new OffscreenCanvas(W, H),
		cellCtx = cell.getContext('2d', { willReadFrequently: true })!;
	if (!('filter' in cellCtx))
		throw new Error('Canvas filters are unsupported');
	count = names.length;
	features = new Float32Array(count * D);
	projections = new Float32Array(count * W);
	const v = new Float32Array(D),
		proj = new Float32Array(W);
	for (let n = 0; n < count; n++) {
		ctx.font = '32px OCRFont';
		const m = ctx.measureText(names[n]),
			a = Math.ceil(m.actualBoundingBoxAscent),
			d = Math.ceil(m.actualBoundingBoxDescent);
		text.width = Math.max(1, Math.ceil(m.width));
		text.height = Math.max(1, a + d);
		ctx.font = '32px OCRFont';
		ctx.fillStyle = 'white';
		ctx.fillRect(0, 0, text.width, text.height);
		ctx.fillStyle = 'black';
		ctx.fillText(names[n], 0, a);
		// Same rendering as descriptor() in font-ocr.js, with no shear.
		cellCtx.setTransform(1, 0, 0, 1, 0, 0);
		cellCtx.filter = 'none';
		cellCtx.fillStyle = '#dddddd';
		cellCtx.fillRect(0, 0, W, H);
		cellCtx.scale(W / text.width, H / text.height);
		cellCtx.filter = `blur(${blur}px)`;
		cellCtx.drawImage(text, 0, 0);
		const p = cellCtx.getImageData(0, 0, W, H).data;
		proj.fill(0);
		for (let y = 0; y < H; y++) {
			let mean = 0;
			for (let x = 0; x < W; x++) {
				const i = (y * W + x) * 4;
				v[y * W + x] =
					0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
				mean += v[y * W + x] / W;
			}
			for (let x = 0; x < W; x++) {
				v[y * W + x] = mean - v[y * W + x];
				proj[x] += v[y * W + x];
			}
		}
		const norm = Math.hypot(...v) || 1,
			pnorm = Math.hypot(...proj) || 1;
		for (let i = 0; i < D; i++) features[n * D + i] = v[i] / norm;
		for (let i = 0; i < W; i++) projections[n * W + i] = proj[i] / pnorm;
		if (n % 500 === 499) post({ kind: 'progress', completed: n + 1 });
	}
	post({ kind: 'progress', completed: count });
}

function lookup(v: Float32Array, proj: Float32Array): ShardMatch[] {
	const short: { i: number; projection: number }[] = [];
	for (let i = 0; i < count; i++) {
		let projection = 0;
		for (let j = 0; j < W; j++)
			projection += proj[j] * projections[i * W + j];
		if (
			short.length < SHORTLIST ||
			projection > short[short.length - 1].projection
		) {
			short.push({ i, projection });
			short.sort((a, b) => b.projection - a.projection);
			if (short.length > SHORTLIST) short.pop();
		}
	}
	return short.map(({ i, projection }) => {
		let score = 0;
		for (let j = 0; j < D; j++) score += v[j] * features[i * D + j];
		return { i: i + offset, projection, score };
	});
}

self.onmessage = async function (event: MessageEvent<TitleIndexRequest>) {
	const request = event.data;
	if (request.kind === 'lookup') {
		post({
			kind: 'matches',
			id: request.id,
			matches: lookup(request.v, request.proj)
		});
		return;
	}
	try {
		offset = request.offset;
		await build(request.names, request.blur, request.fontUrl);
		post({ kind: 'built' });
	} catch (error) {
		post({ kind: 'failed', error: String(error) });
	}
};
