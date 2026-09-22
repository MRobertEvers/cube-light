import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BannerWasm, type SubjectFrame } from '../src/utils/banner-wasm';
import {
	computeSubjectLayer,
	GC_BGD,
	GC_FGD,
	GC_PR_FGD,
	protectionLabels
} from '../src/utils/banner-subject';
import {
	configForGeneration,
	DEFAULT_BANNER_BLEND,
	hasProtection,
	normalizeBannerBlendConfig,
	BANNER_BLEND_ALGORITHM_VERSION,
	type BannerProtection
} from '../src/utils/banner-blend';

const wasm = await BannerWasm.create(
	readFileSync(new URL('../src/wasm/banner-blend.wasm', import.meta.url))
);
// Mirrors the C constants and gate (native/banner_blend.c).
const SURFACE_START = 0.68;
function smooth(lo: number, hi: number, n: number) {
	const t = Math.min(1, Math.max(0, (n - lo) / (hi - lo)));
	return t * t * (3 - 2 * t);
}
function foregroundGate(distance: number, half: number) {
	return 1 - smooth(half * 0.15, half, distance);
}

function rng(seed: number) {
	return function () {
		seed ^= seed << 13;
		seed ^= seed >>> 17;
		seed ^= seed << 5;
		return ((seed >>> 0) % 100000) / 100000;
	};
}

// Edmonds–Karp on an adjacency matrix: slow but obviously correct.
function referenceMaxflow(
	n: number,
	capacity: number[][],
	s: number,
	t: number
): number {
	const residual = capacity.map((row) => row.slice());
	let flow = 0;
	for (;;) {
		const parent = new Array(n).fill(-1);
		parent[s] = s;
		const queue = [s];
		while (queue.length && parent[t] < 0) {
			const u = queue.shift()!;
			for (let v = 0; v < n; v++)
				if (parent[v] < 0 && residual[u][v] > 1e-12) {
					parent[v] = u;
					queue.push(v);
				}
		}
		if (parent[t] < 0) return flow;
		let bottleneck = Infinity;
		for (let v = t; v !== s; v = parent[v])
			bottleneck = Math.min(bottleneck, residual[parent[v]][v]);
		for (let v = t; v !== s; v = parent[v]) {
			residual[parent[v]][v] -= bottleneck;
			residual[v][parent[v]] += bottleneck;
		}
		flow += bottleneck;
	}
}

test('Boykov–Kolmogorov max-flow matches Edmonds–Karp on random graphs', () => {
	const random = rng(7);
	for (let trial = 0; trial < 60; trial++) {
		const nodes = 3 + Math.floor(random() * 12),
			n = nodes + 2,
			s = nodes,
			t = nodes + 1;
		const capacity = Array.from({ length: n }, () => new Array(n).fill(0));
		const terminals: number[] = [],
			edgeNodes: number[] = [],
			edgeCaps: number[] = [];
		for (let i = 0; i < nodes; i++) {
			const source = random() < 0.5 ? Math.round(random() * 10) : 0,
				sink = random() < 0.5 ? Math.round(random() * 10) : 0;
			terminals.push(source, sink);
			capacity[s][i] += source;
			capacity[i][t] += sink;
		}
		for (let e = 0; e < nodes * 2; e++) {
			const i = Math.floor(random() * nodes),
				j = Math.floor(random() * nodes);
			if (i === j) continue;
			const forward = Math.round(random() * 8),
				backward = Math.round(random() * 8);
			edgeNodes.push(i, j);
			edgeCaps.push(forward, backward);
			capacity[i][j] += forward;
			capacity[j][i] += backward;
		}
		// Parallel s→i→t capacity is counted directly as flow by addTerminalWeights.
		assert.ok(
			Math.abs(
				wasm.maxflow(nodes, terminals, edgeNodes, edgeCaps) -
					referenceMaxflow(n, capacity, s, t)
			) < 1e-9,
			`trial ${trial}`
		);
	}
});

function synthetic(width: number, height: number) {
	// A warm, textured disc (the "subject") on a cool, textured background.
	const random = rng(99),
		rgba = new Uint8ClampedArray(width * height * 4),
		truth = new Uint8Array(width * height);
	for (let y = 0; y < height; y++)
		for (let x = 0; x < width; x++) {
			// 4×4 supersampled coverage gives an anti-aliased (partially transparent) edge like real art.
			let coverage = 0;
			for (let j = 0; j < 4; j++)
				for (let i = 0; i < 4; i++)
					if (
						(x + (i + 0.5) / 4 - width * 0.55) ** 2 +
							(y + (j + 0.5) / 4 - height * 0.5) ** 2 <
						(height * 0.3) ** 2
					)
						coverage += 1 / 16;
			const p = y * width + x;
			truth[p] = coverage >= 0.5 ? 1 : 0;
			const noise = (random() - 0.5) * 30,
				mix = function mix(fg: number, bg: number) {
					return coverage * fg + (1 - coverage) * bg + noise;
				};
			rgba[p * 4] = mix(200, 60);
			rgba[p * 4 + 1] = mix(120, 110);
			rgba[p * 4 + 2] = mix(70, 170);
			rgba[p * 4 + 3] = 255;
		}
	return { rgba, truth };
}
function rectProtection(
	x: number,
	y: number,
	w: number,
	h: number
): BannerProtection {
	return {
		source: '/art.jpg',
		rect: { x, y, width: w, height: h },
		strokes: []
	};
}

test('GrabCut recovers a subject from a rough rectangle and is deterministic', () => {
	const width = 96,
		height = 64,
		{ rgba, truth } = synthetic(width, height);
	function run() {
		const rgb = new Float64Array(width * height * 3);
		for (let p = 0; p < width * height; p++)
			for (let c = 0; c < 3; c++) rgb[p * 3 + c] = rgba[p * 4 + c];
		return wasm.grabCut(
			rgb,
			width,
			height,
			protectionLabels(
				rectProtection(0.2, 0.08, 0.7, 0.84),
				width,
				height
			),
			5
		);
	}
	const labels = run();
	assert.deepEqual(labels, run());
	let wrong = 0;
	for (let p = 0; p < truth.length; p++)
		if (
			(labels[p] === GC_FGD || labels[p] === GC_PR_FGD ? 1 : 0) !==
			truth[p]
		)
			wrong++;
	assert.ok(
		wrong / truth.length < 0.02,
		`misclassified ${((100 * wrong) / truth.length).toFixed(2)}%`
	);
});

test('correction strokes are hard constraints and scale with resolution', () => {
	const protection: BannerProtection = {
		source: '/a.jpg',
		rect: { x: 0.25, y: 0.25, width: 0.5, height: 0.5 },
		strokes: [
			{ label: 'foreground', radius: 0.05, points: [0.1, 0.1] },
			{ label: 'background', radius: 0.05, points: [0.5, 0.5] }
		]
	};
	for (const [w, h] of [
		[40, 30],
		[400, 300]
	]) {
		const labels = protectionLabels(protection, w, h);
		assert.equal(
			labels[Math.floor(0.1 * h) * w + Math.floor(0.1 * w)],
			GC_FGD
		);
		assert.equal(
			labels[Math.floor(0.5 * h) * w + Math.floor(0.5 * w)],
			GC_BGD
		);
		assert.equal(
			labels[Math.floor(0.3 * h) * w + Math.floor(0.3 * w)],
			GC_PR_FGD
		);
		assert.equal(
			labels[Math.floor(0.9 * h) * w + Math.floor(0.9 * w)],
			GC_BGD
		);
	}
});

test('guided filter preserves constants and keeps an edge-aligned mask sharp outside a narrow band', () => {
	const width = 40,
		height = 20,
		guide = new Float32Array(width * height * 3),
		binary = new Float32Array(width * height);
	for (let y = 0; y < height; y++)
		for (let x = 0; x < width; x++) {
			const p = y * width + x,
				fg = x >= 20 ? 1 : 0;
			binary[p] = fg;
			guide[p * 3] = fg ? 0.9 : 0.1;
			guide[p * 3 + 1] = 0.5;
			guide[p * 3 + 2] = fg ? 0.2 : 0.7;
		}
	const constant = wasm.guidedFilter(
		guide,
		new Float32Array(width * height).fill(0.3),
		width,
		height,
		3,
		1e-4
	);
	for (const v of constant) assert.ok(Math.abs(v - 0.3) < 1e-5);
	const alpha = wasm.refineMask(guide, binary, width, height, 3);
	for (let y = 0; y < height; y++) {
		assert.equal(alpha[y * width + 5], 0);
		assert.equal(alpha[y * width + 35], 1);
		assert.ok(
			alpha[y * width + 19] < 0.05 && alpha[y * width + 20] > 0.95,
			'edge follows the guide, no halo'
		);
	}
});

test('push–pull reproduces known pixels exactly and fills holes', () => {
	const width = 16,
		height = 8,
		color = new Float32Array(width * height * 3),
		weight = new Float32Array(width * height);
	for (let p = 0; p < width * height; p++) {
		weight[p] = p % width < 8 ? 1 : 0;
		color[p * 3] = weight[p] ? 0.25 : 99;
		color[p * 3 + 1] = 0.5;
		color[p * 3 + 2] = 0.75;
	}
	const filled = wasm.pushPull(color, weight, width, height);
	for (let p = 0; p < width * height; p++) {
		assert.ok(
			Math.abs(filled[p * 3] - 0.25) < 1e-6,
			'hole filled from known colors'
		);
		assert.ok(Math.abs(filled[p * 3 + 2] - 0.75) < 1e-6);
	}
});

test('decontamination recovers foreground color and is safe at alpha extremes', () => {
	const width = 64,
		height = 8,
		n = width * height;
	const F = [0.8, 0.2, 0.1],
		B = [0.05, 0.3, 0.9];
	const alpha = new Float32Array(n),
		color = new Float32Array(n * 3);
	for (let y = 0; y < height; y++)
		for (let x = 0; x < width; x++) {
			const p = y * width + x;
			alpha[p] =
				x < 24
					? 1
					: x >= 40
						? 0
						: x === 24
							? 1e-7
							: x === 25
								? 0.999999
								: (40 - x) / 16;
			for (let c = 0; c < 3; c++)
				color[p * 3 + c] = alpha[p] * F[c] + (1 - alpha[p]) * B[c];
		}
	const { foregroundDelta, backgroundDelta } = wasm.decontaminate(
		color,
		alpha,
		width,
		height,
		1
	);
	for (let p = 0; p < n; p++) {
		for (let c = 0; c < 3; c++) {
			const k = p * 3 + c;
			assert.ok(
				Number.isFinite(foregroundDelta[k]) &&
					Number.isFinite(backgroundDelta[k])
			);
			const f = color[k] + foregroundDelta[k];
			assert.ok(
				f >= -1e-6 && f <= 1 + 1e-6,
				'no out-of-range (over-saturated) colors'
			);
			if (alpha[p] === 0) {
				assert.equal(foregroundDelta[k], 0);
				assert.equal(backgroundDelta[k], 0);
			}
			if (alpha[p] === 1) assert.equal(foregroundDelta[k], 0);
			if (alpha[p] >= 0.25 && alpha[p] < 1)
				assert.ok(
					Math.abs(f - F[c]) < 0.02,
					`recovered F at alpha ${alpha[p]}`
				);
		}
	}
	// Strength 0 is a no-op.
	assert.ok(
		wasm
			.decontaminate(color, alpha, width, height, 0)
			.foregroundDelta.every((v) => v === 0)
	);
});

test('seam search routes the transition around a protected subject', () => {
	const w = 320,
		h = 64,
		rgba = new Uint8ClampedArray(w * h * 4).fill(128);
	const alpha = new Float32Array(w * h);
	// Subject occupying x ∈ [150, 185), right on top of the default position (0.5·w = 160).
	for (let y = 0; y < h; y++)
		for (let x = 150; x < 185; x++) alpha[y * w + x] = 1;
	const subject: SubjectFrame = {
		alpha,
		foregroundDelta: new Float32Array(w * h * 3),
		backgroundDelta: new Float32Array(w * h * 3)
	};
	const config = { ...DEFAULT_BANNER_BLEND, width: 0.12 };
	const half = (config.width * w) / 2;
	const routed = { path: new Float32Array() },
		straight = { path: new Float32Array() };
	wasm.blend(rgba, w, h, config, subject, routed);
	for (const seam of routed.path)
		for (let x = 150; x < 185; x++)
			assert.ok(
				foregroundGate(x + 0.5 - seam, half) > 0.999,
				`seam at ${seam} would fade subject column ${x}`
			);
	// Without protection the flat image gives the seam no reason to leave the requested position.
	wasm.blend(rgba, w, h, config, null, straight);
	assert.ok(straight.path.every((x) => Math.abs(x - 160) < 1));
});

test('subject-preserving composite keeps protected pixels, reaches the exact surface, and is deterministic', () => {
	const w = 320,
		h = 48,
		rgba = new Uint8ClampedArray(w * h * 4);
	for (let y = 0; y < h; y++)
		for (let x = 0; x < w; x++) {
			const p = (y * w + x) * 4;
			rgba[p] = (x * 13 + y * 7) % 256;
			rgba[p + 1] = (x * 3 + y * 19) % 256;
			rgba[p + 2] = (x * 17 + y * 5) % 256;
			rgba[p + 3] = 255;
		}
	const alpha = new Float32Array(w * h);
	for (let y = 0; y < h; y++)
		for (let x = 120; x < 170; x++) alpha[y * w + x] = 1;
	const subject: SubjectFrame = {
		alpha,
		foregroundDelta: new Float32Array(w * h * 3),
		backgroundDelta: new Float32Array(w * h * 3)
	};
	const config = { ...DEFAULT_BANNER_BLEND, protectSubject: true };
	for (const method of ['multiband', 'poisson', 'fade'] as const) {
		const out = wasm.blend(rgba, w, h, { ...config, method }, subject);
		assert.deepEqual(
			out,
			wasm.blend(rgba, w, h, { ...config, method }, subject)
		);
		for (let y = 0; y < h; y++) {
			for (let x = 120; x < 170; x++)
				for (let c = 0; c < 3; c++)
					assert.equal(
						out[(y * w + x) * 4 + c],
						rgba[(y * w + x) * 4 + c],
						`${method} protected pixel ${x},${y}`
					);
			for (let x = Math.ceil(SURFACE_START * w); x < w; x++)
				assert.deepEqual(
					[...out.slice((y * w + x) * 4, (y * w + x) * 4 + 4)],
					[242, 233, 230, 255]
				);
		}
	}
});

test('computeSubjectLayer is deterministic for identical pixels and settings', () => {
	const width = 120,
		height = 80,
		{ rgba } = synthetic(width, height);
	const protection = rectProtection(0.2, 0.08, 0.7, 0.84);
	const a = computeSubjectLayer(wasm, rgba, width, height, protection, {
		feather: 3,
		decontamination: 0.9
	});
	const b = computeSubjectLayer(wasm, rgba, width, height, protection, {
		feather: 3,
		decontamination: 0.9
	});
	assert.deepEqual(a.alpha, b.alpha);
	assert.deepEqual(a.foregroundDelta, b.foregroundDelta);
	assert.deepEqual(a.backgroundDelta, b.backgroundDelta);
	assert.ok(
		a.alpha.some((v) => v > 0 && v < 1),
		'refined edge has fractional alpha'
	);
});

test('config migration keeps v1 artifacts and generation drops selections for other artwork', () => {
	const legacy = normalizeBannerBlendConfig({
		method: 'poisson',
		contentAware: true,
		position: 0.49,
		width: 0.13,
		surface: '#f2e9e6'
	} as never);
	assert.equal(legacy.version, 1);
	assert.equal(legacy.protectSubject, false);
	assert.equal(legacy.feather, DEFAULT_BANNER_BLEND.feather);
	const protection = rectProtection(0.1, 0.1, 0.5, 0.5);
	const config = {
		...legacy,
		protectSubject: true,
		protection: {
			...protection,
			source: 'http://a.test/images/art_crop/1.jpg'
		}
	};
	assert.equal(
		configForGeneration(config, 'http://b.test/images/art_crop/1.jpg')
			.protection?.source,
		'http://a.test/images/art_crop/1.jpg'
	);
	assert.equal(
		configForGeneration(config, 'http://b.test/images/art_crop/2.jpg')
			.protection,
		null
	);
	assert.equal(
		configForGeneration(config, 'x').version,
		BANNER_BLEND_ALGORITHM_VERSION
	);
	assert.equal(
		hasProtection(config, 'http://b.test/images/art_crop/1.jpg'),
		true
	);
	assert.equal(
		hasProtection(
			{ ...config, protectSubject: false },
			'http://b.test/images/art_crop/1.jpg'
		),
		false
	);
});

test('the WASM wrapper frees its scratch memory', () => {
	const w = 640,
		h = 224,
		rgba = new Uint8ClampedArray(w * h * 4).fill(200);
	function memory() {
		return (wasm as unknown as { wasm: { memory: WebAssembly.Memory } })
			.wasm.memory.buffer.byteLength;
	}
	wasm.blend(rgba, w, h, DEFAULT_BANNER_BLEND);
	const size = memory();
	for (let i = 0; i < 20; i++)
		wasm.blend(rgba, w, h, {
			...DEFAULT_BANNER_BLEND,
			method: (['multiband', 'poisson', 'fade'] as const)[i % 3]
		});
	assert.equal(memory(), size);
});
