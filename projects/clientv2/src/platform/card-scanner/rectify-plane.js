import { getCV, findTitleStrips } from './edge-titles.js';
/**
 * @param {import('./types.js').ScanImage} image
 */
export async function rectifyPlane(image) {
	const { cv } = await getCV(),
		scale = Math.min(1, 2200 / image.width),
		small = document.createElement('canvas');
	small.width = image.width * scale;
	small.height = image.height * scale;
	small.getContext('2d').drawImage(image, 0, 0, small.width, small.height);
	const src = cv.imread(small),
		rgb = new cv.Mat(),
		hsv = new cv.Mat(),
		mask = new cv.Mat(),
		contours = new cv.MatVector(),
		hier = new cv.Mat(),
		kernel = cv.Mat.ones(3, 3, cv.CV_8U);
	let low, high;
	try {
		cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB);
		cv.cvtColor(rgb, hsv, cv.COLOR_RGB2HSV);
		low = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [3, 125, 100, 0]);
		high = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [30, 255, 255, 255]);
		cv.inRange(hsv, low, high, mask);
		cv.morphologyEx(mask, mask, cv.MORPH_CLOSE, kernel);
		cv.findContours(
			mask,
			contours,
			hier,
			cv.RETR_LIST,
			cv.CHAIN_APPROX_SIMPLE
		);
		const quads = [];
		for (let i = 0; i < contours.size(); i++) {
			const c = contours.get(i),
				a = new cv.Mat();
			try {
				const area = cv.contourArea(c);
				if (area < 3000 || area > small.width * small.height * 0.08)
					continue;
				cv.approxPolyDP(c, a, cv.arcLength(c, true) * 0.025, true);
				if (a.rows !== 4 || !cv.isContourConvex(a)) continue;
				let p = Array.from({ length: 4 }, (_, j) => [
					a.data32S[j * 2] / scale,
					a.data32S[j * 2 + 1] / scale
				]);
				const cx = p.reduce((n, v) => n + v[0], 0) / 4,
					cy = p.reduce((n, v) => n + v[1], 0) / 4;
				p.sort(
					(a, b) =>
						Math.atan2(a[1] - cy, a[0] - cx) -
						Math.atan2(b[1] - cy, b[0] - cx)
				);
				let first = 0;
				for (let j = 1; j < 4; j++)
					if (p[j][0] + p[j][1] < p[first][0] + p[first][1])
						first = j;
				p = p.map((_, j) => p[(first + j) % 4]);
				const w = Math.hypot(p[1][0] - p[0][0], p[1][1] - p[0][1]),
					h = Math.hypot(p[3][0] - p[0][0], p[3][1] - p[0][1]);
				if (h / w < 0.7 || h / w > 1.8) continue;
				quads.push({ p, area, w, h });
			} finally {
				c.delete();
				a.delete();
			}
		}
		quads.sort((a, b) => b.area - a.area);
		if (!quads.length) throw Error('No reliable plane reference');
		const quad = quads[0],
			w = 600,
			h = (w * 88) / 63;
		const from = cv.matFromArray(4, 1, cv.CV_32FC2, quad.p.flat()),
			to = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, w, 0, w, h, 0, h]),
			M = cv.getPerspectiveTransform(from, to),
			m = Array.from(M.data64F);
		function transform(x, y) {
			const z = m[6] * x + m[7] * y + m[8];
			return [
				(m[0] * x + m[1] * y + m[2]) / z,
				(m[3] * x + m[4] * y + m[5]) / z
			];
		}
		const edges = await findTitleStrips(image),
			ys = edges.flatMap((l) => [l.y1, l.y2]),
			minY = Math.max(0, Math.min.apply(null, ys) - 200),
			maxY = Math.min(image.height, Math.max.apply(null, ys) + 200),
			corners = [
				[0, minY],
				[image.width, minY],
				[image.width, maxY],
				[0, maxY]
			].map((p) => transform(p[0], p[1]));
		const x0 = Math.min.apply(null, corners.map((p) => p[0])),
			y0 = Math.min.apply(null, corners.map((p) => p[1])),
			outW = Math.max.apply(null, corners.map((p) => p[0])) - x0,
			outH = Math.max.apply(null, corners.map((p) => p[1])) - y0,
			s = Math.min(1, 6500 / Math.max(outW, outH));
		const n = [
				s * (m[0] - x0 * m[6]),
				s * (m[1] - x0 * m[7]),
				s * (m[2] - x0 * m[8]),
				s * (m[3] - y0 * m[6]),
				s * (m[4] - y0 * m[7]),
				s * (m[5] - y0 * m[8]),
				m[6],
				m[7],
				m[8]
			],
			N = cv.matFromArray(3, 3, cv.CV_64F, n),
			inverse = new cv.Mat();
		cv.invert(N, inverse);
		const orig = document.createElement('canvas');
		orig.width = image.width;
		orig.height = image.height;
		orig.getContext('2d').drawImage(image, 0, 0);
		const full = cv.imread(orig),
			out = new cv.Mat();
		cv.warpPerspective(
			full,
			out,
			N,
			new cv.Size(Math.ceil(outW * s), Math.ceil(outH * s)),
			cv.INTER_CUBIC,
			cv.BORDER_CONSTANT,
			new cv.Scalar(180, 180, 180, 255)
		);
		const canvas = document.createElement('canvas');
		cv.imshow(canvas, out);
		const inv = Array.from(inverse.data64F);
		for (const mat of [from, to, M, N, inverse, full, out]) mat.delete();
		return {
			canvas,
			cardWidth: w * s,
			cardHeight: h * s,
			quad: quad.p,
			matrix: n,
			inverse: inv,
			toOriginal: function (x, y) {
				const z = inv[6] * x + inv[7] * y + inv[8];
				return [
					(inv[0] * x + inv[1] * y + inv[2]) / z,
					(inv[3] * x + inv[4] * y + inv[5]) / z
				];
			}
		};
	} finally {
		for (const m of [
			src,
			rgb,
			hsv,
			mask,
			contours,
			hier,
			kernel,
			low,
			high
		])
			m?.delete();
	}
}
