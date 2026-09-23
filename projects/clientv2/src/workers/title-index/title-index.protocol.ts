// Messages between TitleIndexWorkerPool (main thread) and each TitleIndexWorker shard.

export type TitleIndexRequest =
	| {
			kind: 'build';
			names: string[];
			offset: number;
			blur: number;
			fontUrl: string;
	  }
	| { kind: 'lookup'; id: number; v: Float32Array; proj: Float32Array };
/** A shard's best names by projection, with the full-descriptor score of each. */
export type ShardMatch = { i: number; projection: number; score: number };
export type TitleIndexResponse =
	| { kind: 'progress'; completed: number }
	| { kind: 'built' }
	| { kind: 'failed'; error: string }
	| { kind: 'matches'; id: number; matches: ShardMatch[] };
