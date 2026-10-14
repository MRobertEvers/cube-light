import path from 'path';
import { parentPort, workerData } from 'worker_threads';
import { DEPTH_STAMP, heightMap, modelInput } from './height-map';
import { encodeGreyPng } from './png';
import type { DepthWorkerRequest, DepthWorkerResponse, DepthWorkerSetup } from './depth-protocol';

/**
 * The height-map maker, on a thread of its own so the server's event loop never waits on it:
 * the model (Depth-Anything V2 Small, ONNX) is loaded on the first request and kept, and each
 * request is one art crop's JPEG in, its height map's PNG out (height-map.ts).
 */

// onnxruntime-node's own types need a newer TypeScript than this project's; these are the parts used.
interface OrtTensor {
	dims: readonly number[];
	data: Float32Array;
}
interface OrtSession {
	inputNames: readonly string[];
	outputNames: readonly string[];
	run(feeds: Record<string, OrtTensor>): Promise<Record<string, OrtTensor>>;
}
interface Ort {
	InferenceSession: {
		create(model: string, options: Record<string, unknown>): Promise<OrtSession>;
	};
	Tensor: new (type: 'float32', data: Float32Array, dims: number[]) => OrtTensor;
}

const ort = require('onnxruntime-node') as Ort;
// node-gyp builds into build/Release beside tsc's build/src.
const imageSample = require(path.join(__dirname, '../../../Release/image_sample.node')) as {
	decode(image: Buffer): { width: number; height: number; rgb: Buffer };
};

const setup = workerData as DepthWorkerSetup;
let session: Promise<OrtSession> | null = null;

function loadSession(): Promise<OrtSession> {
	if (!session) {
		session = ort.InferenceSession.create(setup.modelPath, {
			graphOptimizationLevel: 'all',
			executionProviders: ['cpu']
		});
	}
	return session;
}

async function make(jpeg: Buffer): Promise<Buffer> {
	const model = await loadSession();
	const art = imageSample.decode(jpeg);
	const input = modelInput({ width: art.width, height: art.height, rgb: art.rgb });
	const feeds: Record<string, OrtTensor> = {};
	feeds[model.inputNames[0]] = new ort.Tensor('float32', input.data, [1, 3, input.height, input.width]);
	const outputs = await model.run(feeds);
	const predicted = outputs[model.outputNames[0]];
	const dims = predicted.dims;
	const map = heightMap(predicted.data, dims[dims.length - 1], dims[dims.length - 2], art.width, art.height);
	return encodeGreyPng(art.width, art.height, map, DEPTH_STAMP);
}

parentPort?.on('message', (request: DepthWorkerRequest) => {
	const { id, jpeg } = request;
	make(Buffer.from(jpeg))
		.then((png) => {
			const response: DepthWorkerResponse = { id, png };
			parentPort?.postMessage(response);
		})
		.catch((error: unknown) => {
			const response: DepthWorkerResponse = { id, error: error instanceof Error ? error.message : String(error) };
			parentPort?.postMessage(response);
		});
});
