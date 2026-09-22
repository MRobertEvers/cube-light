export async function createRecognizer(
	model = 'small',
	stretch = 1,
	enhance = false,
	deblur = 0,
	lexical = false
) {
	const worker = new Worker(
			new URL('./recognizer.worker.js', import.meta.url),
			{ type: 'module' }
		),
		pending = new Map();
	let next = 0;
	worker.onmessage = ({ data }) => {
		const p = pending.get(data.id);
		pending.delete(data.id);
		if (data.error) p?.reject(new Error(data.error));
		else p?.resolve(data);
	};
	worker.onerror = (e) => {
		for (const p of pending.values())
			p.reject(new Error(e.message || 'Recognition worker failed'));
		pending.clear();
	};
	const call = (pixels, candidateNames) =>
		new Promise((resolve, reject) => {
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
	try {
		await call();
	} catch (e) {
		worker.terminate();
		throw e;
	}
	return {
		recognize: (canvas, candidateNames) =>
			call(
				canvas
					.getContext('2d')
					.getImageData(0, 0, canvas.width, canvas.height),
				candidateNames
			),
		dispose: () => worker.terminate()
	};
}
