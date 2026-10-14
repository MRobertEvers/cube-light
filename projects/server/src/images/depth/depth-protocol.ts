/** What the server and its height-map thread (depth-worker.ts) say to each other. */

export interface DepthWorkerSetup {
	/** The model, an ONNX file. */
	modelPath: string;
}

export interface DepthWorkerRequest {
	id: number;
	/** The art crop's JPEG bytes. */
	jpeg: Uint8Array;
}

export type DepthWorkerResponse =
	| { id: number; png: Uint8Array; error?: undefined }
	| { id: number; error: string; png?: undefined };
