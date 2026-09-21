import { MaxFlowGraph } from './banner-maxflow';

// GrabCut (Rother, Kolmogorov & Blake, SIGGRAPH 2004) with the numerical choices of
// OpenCV's reference implementation: five full-covariance components per GMM, gamma 50,
// an 8-neighbourhood, and hard-constraint weight 8γ+1. Colors are 0..255 sRGB.
//
// Determinism: GMMs are initialised with Orchard–Bouman principal-axis splitting (the
// clustering cited by the paper), which needs no random seed; the iteration count is fixed;
// and the max-flow solver has a fixed traversal order.

export const GC_BGD = 0, GC_FGD = 1, GC_PR_BGD = 2, GC_PR_FGD = 3;
const COMPONENTS = 5;
const GAMMA = 50;
const LAMBDA = 8 * GAMMA + 1;

type Gmm = { weight: Float64Array; mean: Float64Array; inverse: Float64Array; logNorm: Float64Array };

/** Symmetric 3×3 eigen-decomposition by cyclic Jacobi with a fixed sweep count. */
function largestEigenvector(m: number[]): { value: number; vector: number[] } {
	const a = [[m[0], m[1], m[2]], [m[1], m[3], m[4]], [m[2], m[4], m[5]]];
	const v = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
	for (let sweep = 0; sweep < 12; sweep++) for (const [p, q] of [[0, 1], [0, 2], [1, 2]]) {
		if (Math.abs(a[p][q]) < 1e-12) continue;
		const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
		const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
		const c = 1 / Math.sqrt(t * t + 1), s = t * c;
		for (let k = 0; k < 3; k++) {
			const akp = a[k][p], akq = a[k][q];
			a[k][p] = c * akp - s * akq; a[k][q] = s * akp + c * akq;
		}
		for (let k = 0; k < 3; k++) {
			const apk = a[p][k], aqk = a[q][k];
			a[p][k] = c * apk - s * aqk; a[q][k] = s * apk + c * aqk;
		}
		for (let k = 0; k < 3; k++) {
			const vkp = v[k][p], vkq = v[k][q];
			v[k][p] = c * vkp - s * vkq; v[k][q] = s * vkp + c * vkq;
		}
	}
	let best = 0;
	for (let k = 1; k < 3; k++) if (a[k][k] > a[best][best]) best = k;
	return { value: a[best][best], vector: [v[0][best], v[1][best], v[2][best]] };
}

function statistics(color: Float64Array, members: Int32Array, count: number) {
	let r = 0, g = 0, b = 0;
	for (let k = 0; k < count; k++) { const p = members[k] * 3; r += color[p]; g += color[p + 1]; b += color[p + 2]; }
	r /= count; g /= count; b /= count;
	const cov = [0, 0, 0, 0, 0, 0];
	for (let k = 0; k < count; k++) {
		const p = members[k] * 3, dr = color[p] - r, dg = color[p + 1] - g, db = color[p + 2] - b;
		cov[0] += dr * dr; cov[1] += dr * dg; cov[2] += dr * db; cov[3] += dg * dg; cov[4] += dg * db; cov[5] += db * db;
	}
	for (let k = 0; k < 6; k++) cov[k] /= count;
	return { mean: [r, g, b], cov };
}

/** Orchard–Bouman: repeatedly split the cluster with the largest principal variance. */
function orchardBouman(color: Float64Array, pixels: Int32Array, out: Int32Array): void {
	let clusters: Int32Array[] = [pixels];
	while (clusters.length < COMPONENTS) {
		let best = -1, bestValue = -1, bestAxis: number[] = [], bestMean: number[] = [];
		for (let c = 0; c < clusters.length; c++) {
			if (clusters[c].length < 2) continue;
			const { mean, cov } = statistics(color, clusters[c], clusters[c].length);
			const { value, vector } = largestEigenvector(cov);
			if (value > bestValue) { best = c; bestValue = value; bestAxis = vector; bestMean = mean; }
		}
		if (best < 0 || bestValue <= 1e-9) break;
		const source = clusters[best], split = bestMean[0] * bestAxis[0] + bestMean[1] * bestAxis[1] + bestMean[2] * bestAxis[2];
		const low: number[] = [], high: number[] = [];
		for (const p of source) {
			const projection = color[p * 3] * bestAxis[0] + color[p * 3 + 1] * bestAxis[1] + color[p * 3 + 2] * bestAxis[2];
			(projection <= split ? low : high).push(p);
		}
		if (!low.length || !high.length) break;
		clusters = [...clusters.slice(0, best), Int32Array.from(low), Int32Array.from(high), ...clusters.slice(best + 1)];
	}
	clusters.forEach((cluster, c) => { for (const p of cluster) out[p] = c; });
}

function learnGmm(color: Float64Array, pixels: Int32Array, component: Int32Array): Gmm {
	const gmm: Gmm = { weight: new Float64Array(COMPONENTS), mean: new Float64Array(COMPONENTS * 3),
		inverse: new Float64Array(COMPONENTS * 9), logNorm: new Float64Array(COMPONENTS) };
	const groups: number[][] = Array.from({ length: COMPONENTS }, () => []);
	for (const p of pixels) groups[component[p]].push(p);
	for (let c = 0; c < COMPONENTS; c++) {
		if (!groups[c].length) continue;
		const { mean, cov } = statistics(color, Int32Array.from(groups[c]), groups[c].length);
		// OpenCV's regularisation keeps singular (flat-color) clusters invertible.
		cov[0] += 0.01; cov[3] += 0.01; cov[5] += 0.01;
		const [a, b, d, e, f, i] = cov; // [[a b d] [b e f] [d f i]]
		const det = a * (e * i - f * f) - b * (b * i - f * d) + d * (b * f - e * d);
		const inv = [(e * i - f * f), (d * f - b * i), (b * f - d * e), (d * f - b * i), (a * i - d * d), (b * d - a * f), (b * f - d * e), (b * d - a * f), (a * e - b * b)];
		for (let k = 0; k < 9; k++) gmm.inverse[c * 9 + k] = inv[k] / det;
		gmm.mean.set(mean, c * 3);
		gmm.weight[c] = groups[c].length / pixels.length;
		gmm.logNorm[c] = Math.log(gmm.weight[c]) - 0.5 * Math.log(det);
	}
	return gmm;
}

function componentLogLikelihood(gmm: Gmm, c: number, r: number, g: number, b: number): number {
	if (gmm.weight[c] <= 0) return -Infinity;
	const m = gmm.mean, inv = gmm.inverse, o = c * 9;
	const dr = r - m[c * 3], dg = g - m[c * 3 + 1], db = b - m[c * 3 + 2];
	const q = dr * (dr * inv[o] + dg * inv[o + 3] + db * inv[o + 6]) +
		dg * (dr * inv[o + 1] + dg * inv[o + 4] + db * inv[o + 7]) +
		db * (dr * inv[o + 2] + dg * inv[o + 5] + db * inv[o + 8]);
	return gmm.logNorm[c] - 0.5 * q;
}

function mixtureNegativeLog(gmm: Gmm, r: number, g: number, b: number): number {
	// Log-sum-exp keeps distant colors finite instead of underflowing to log(0).
	let max = -Infinity;
	const values = new Float64Array(COMPONENTS);
	for (let c = 0; c < COMPONENTS; c++) { values[c] = componentLogLikelihood(gmm, c, r, g, b); if (values[c] > max) max = values[c]; }
	if (max === -Infinity) return 1e3;
	let sum = 0;
	for (let c = 0; c < COMPONENTS; c++) if (values[c] > -Infinity) sum += Math.exp(values[c] - max);
	return Math.min(1e3, -(max + Math.log(sum)));
}

/**
 * Runs GrabCut in place on `labels` (GC_* values). `rgb` is interleaved 0..255 sRGB.
 * Pixels labelled GC_BGD/GC_FGD are hard constraints; probable labels are re-estimated.
 */
export function grabCut(rgb: Float64Array, width: number, height: number, labels: Uint8Array, iterations = 5): void {
	const n = width * height;
	const neighbours: Array<[number, number, number]> = [[1, 0, 1], [0, 1, 1], [1, 1, Math.SQRT1_2], [-1, 1, Math.SQRT1_2]];
	let sum = 0, pairs = 0;
	for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) for (const [dx, dy] of neighbours) {
		const nx = x + dx, ny = y + dy;
		if (nx < 0 || nx >= width || ny >= height) continue;
		const p = (y * width + x) * 3, q = (ny * width + nx) * 3;
		sum += (rgb[p] - rgb[q]) ** 2 + (rgb[p + 1] - rgb[q + 1]) ** 2 + (rgb[p + 2] - rgb[q + 2]) ** 2; pairs++;
	}
	const beta = sum > 0 ? pairs / (2 * sum) : 0;
	const smooth = new Float64Array(n * 4);
	for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) neighbours.forEach(([dx, dy, weight], k) => {
		const nx = x + dx, ny = y + dy;
		if (nx < 0 || nx >= width || ny >= height) return;
		const p = (y * width + x) * 3, q = (ny * width + nx) * 3;
		const d = (rgb[p] - rgb[q]) ** 2 + (rgb[p + 1] - rgb[q + 1]) ** 2 + (rgb[p + 2] - rgb[q + 2]) ** 2;
		smooth[(y * width + x) * 4 + k] = GAMMA * weight * Math.exp(-beta * d);
	});

	const component = new Int32Array(n);
	const isForeground = (p: number) => labels[p] === GC_FGD || labels[p] === GC_PR_FGD;
	const split = () => {
		const fg: number[] = [], bg: number[] = [];
		for (let p = 0; p < n; p++) (isForeground(p) ? fg : bg).push(p);
		return { fg: Int32Array.from(fg), bg: Int32Array.from(bg) };
	};
	let { fg, bg } = split();
	if (!fg.length || !bg.length) return;
	orchardBouman(rgb, fg, component);
	orchardBouman(rgb, bg, component);
	let fgGmm = learnGmm(rgb, fg, component), bgGmm = learnGmm(rgb, bg, component);

	for (let iteration = 0; iteration < iterations; iteration++) {
		if (iteration > 0) {
			// Assign each pixel to its most likely component, then re-learn both models.
			for (let p = 0; p < n; p++) {
				const gmm = isForeground(p) ? fgGmm : bgGmm;
				let best = 0, bestValue = -Infinity;
				for (let c = 0; c < COMPONENTS; c++) {
					const value = componentLogLikelihood(gmm, c, rgb[p * 3], rgb[p * 3 + 1], rgb[p * 3 + 2]);
					if (value > bestValue) { bestValue = value; best = c; }
				}
				component[p] = best;
			}
			({ fg, bg } = split());
			if (!fg.length || !bg.length) return;
			fgGmm = learnGmm(rgb, fg, component); bgGmm = learnGmm(rgb, bg, component);
		}
		const graph = new MaxFlowGraph(n, n * 4);
		for (let p = 0; p < n; p++) {
			const label = labels[p];
			if (label === GC_BGD) graph.addTerminalWeights(p, 0, LAMBDA);
			else if (label === GC_FGD) graph.addTerminalWeights(p, LAMBDA, 0);
			else {
				const r = rgb[p * 3], g = rgb[p * 3 + 1], b = rgb[p * 3 + 2];
				graph.addTerminalWeights(p, mixtureNegativeLog(bgGmm, r, g, b), mixtureNegativeLog(fgGmm, r, g, b));
			}
		}
		for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) neighbours.forEach(([dx, dy], k) => {
			const nx = x + dx, ny = y + dy;
			if (nx < 0 || nx >= width || ny >= height) return;
			const weight = smooth[(y * width + x) * 4 + k];
			graph.addEdge(y * width + x, ny * width + nx, weight, weight);
		});
		graph.maxflow();
		for (let p = 0; p < n; p++) {
			if (labels[p] === GC_PR_BGD || labels[p] === GC_PR_FGD) labels[p] = graph.inSourceSegment(p) ? GC_PR_FGD : GC_PR_BGD;
		}
	}
}
