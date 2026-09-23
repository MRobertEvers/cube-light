/** Messages between CardOcrWorkerClient and CardOcrWorker. A request without pixels only loads the model. */
export type OcrRecognizerRequest = {
	id: number;
	pixels?: ImageData;
	model: string;
	stretch?: number;
	enhance?: boolean;
	deblur?: number;
	lexical?: boolean;
	candidateNames?: string[];
};
/** CardOcrWorker's answer to the request with the same id. */
export type OcrRecognizerResponse =
	| { id: number; error: string }
	| { id: number; ready: true }
	| { id: number; text: string; score: number; lexical?: object[] };
