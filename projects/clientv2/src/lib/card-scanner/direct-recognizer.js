/**
 * @param {string} [modelArg]
 * @param {number} [stretchArg]
 * @param {boolean} [enhanceArg]
 * @param {number} [deblurArg]
 * @param {boolean} [lexicalArg]
 */
export async function createRecognizer(
	modelArg,
	stretchArg,
	enhanceArg,
	deblurArg,
	lexicalArg
) {
	const model = modelArg === undefined ? 'small' : modelArg;
	const stretch = stretchArg === undefined ? 1 : stretchArg;
	const enhance = enhanceArg === undefined ? false : enhanceArg;
	const deblur = deblurArg === undefined ? 0 : deblurArg;
	const lexical = lexicalArg === undefined ? false : lexicalArg;

	const worker = new Worker(
			new URL('../../workers/ocr-recognizer.worker.ts', import.meta.url),
			{ type: 'module' }
		),
		pending = new Map();
	let next = 0;
	worker.onmessage =
		/**
		 * @param {MessageEvent<{id: number, error?: string, ready?: boolean, text?: string, score?: number, lexical?: object[]}>} event
		 */
		function (event) {
			const { data } = event;

			const p = pending.get(data.id);
			pending.delete(data.id);
			if (data.error) p?.reject(new Error(data.error));
			else p?.resolve(data);
		};
	worker.onerror = function (e) {
		for (const p of pending.values())
			p.reject(new Error(e.message || 'Recognition worker failed'));
		pending.clear();
	};
	function call(pixels, candidateNames) {
		return new Promise((resolve, reject) => {
			const id = next++;
			pending.set(id, { resolve, reject });
			worker.postMessage(
				{
					id,
					pixels,
					model,
					stretch,
					enhance,
					deblur,
					lexical,
					candidateNames
				},
				pixels ? [pixels.data.buffer] : []
			);
		});
	}
	try {
		await call();
	} catch (e) {
		worker.terminate();
		throw e;
	}
	return {
		recognize: function (canvas, candidateNames) {
			return call(
				canvas
					.getContext('2d')
					.getImageData(0, 0, canvas.width, canvas.height),
				candidateNames
			);
		},
		dispose: function () {
			return worker.terminate();
		}
	};
}
