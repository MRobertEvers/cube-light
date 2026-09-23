// Thin wrapper around native/card_list_lint.c (built to src/platform/wasm/card-list-lint.wasm by
// `npm run build:wasm`). The C side owns the name index; this file only moves strings and
// result indexes across the boundary.

type Exports = {
	memory: WebAssembly.Memory;
	_initialize(): void;
	malloc(size: number): number;
	free(pointer: number): void;
	cl_load(blob: number, size: number): number;
	cl_count(): number;
	cl_name(index: number): number;
	cl_find(text: number, length: number): number;
	cl_suggest(
		text: number,
		length: number,
		outNames: number,
		outDistances: number,
		capacity: number
	): number;
	cl_complete(
		text: number,
		length: number,
		outNames: number,
		capacity: number
	): number;
};

export type CardNameSuggestion = { name: string; distance: number };

// Matches MAX_RESULTS in the C source; longer queries are truncated there anyway.
const MAX_RESULTS = 32;
const MAX_QUERY_BYTES = 1024;

export class CardListLintWasm {
	private readonly wasm: Exports;
	private readonly encoder = new TextEncoder();
	private readonly decoder = new TextDecoder();
	private readonly query: number;
	private readonly results: number;
	private readonly distances: number;

	private constructor(instance: WebAssembly.Instance, blob: Uint8Array) {
		this.wasm = instance.exports as unknown as Exports;
		this.wasm._initialize();
		// The index keeps pointers into the blob, so it stays allocated for the module's life.
		const pointer = this.wasm.malloc(blob.length);
		this.query = this.wasm.malloc(MAX_QUERY_BYTES);
		this.results = this.wasm.malloc(MAX_RESULTS * 4);
		this.distances = this.wasm.malloc(MAX_RESULTS * 4);
		if (!pointer || !this.query || !this.results || !this.distances)
			throw new Error('The card checker ran out of memory.');
		new Uint8Array(this.wasm.memory.buffer, pointer, blob.length).set(blob);
		if (!this.wasm.cl_load(pointer, blob.length))
			throw new Error('The card name index is invalid.');
	}

	/** `blob` is the server's NMI1 name index (/suggest/card-names/index). */
	static async create(
		bytes: BufferSource,
		blob: Uint8Array
	): Promise<CardListLintWasm> {
		const { instance } = await WebAssembly.instantiate(bytes, {
			env: { emscripten_notify_memory_growth: function () {} }
		});
		return new CardListLintWasm(instance, blob);
	}

	get count(): number {
		return this.wasm.cl_count();
	}

	/** The exact card name the server would accept for `name`, or null. */
	find(name: string): string | null {
		const index = this.wasm.cl_find(this.query, this.setQuery(name));
		return index < 0 ? null : this.name(index);
	}

	/** Known names within a small edit distance of `name`, closest first. */
	suggest(name: string, limitArg?: number): CardNameSuggestion[] {
		const limit = limitArg === undefined ? 3 : limitArg;

		const found = this.wasm.cl_suggest(
			this.query,
			this.setQuery(name),
			this.results,
			this.distances,
			Math.min(limit, MAX_RESULTS)
		);
		const indexes = this.readU32(this.results, found);
		const distances = this.readU32(this.distances, found);
		return indexes.map((index, i) => ({
			name: this.name(index),
			distance: distances[i]
		}));
	}

	/** Names whose words start with the words of `prefix`, best first. */
	complete(prefix: string, limitArg?: number): string[] {
		const limit = limitArg === undefined ? 8 : limitArg;

		const found = this.wasm.cl_complete(
			this.query,
			this.setQuery(prefix),
			this.results,
			Math.min(limit, MAX_RESULTS)
		);
		return this.readU32(this.results, found).map((index) =>
			this.name(index)
		);
	}

	private setQuery(text: string): number {
		// Views are recreated on each access: memory growth detaches earlier ArrayBuffers.
		const view = new Uint8Array(
			this.wasm.memory.buffer,
			this.query,
			MAX_QUERY_BYTES
		);
		return this.encoder.encodeInto(text, view).written;
	}

	private readU32(pointer: number, length: number): number[] {
		return Array.from(
			new Uint32Array(this.wasm.memory.buffer, pointer, length)
		);
	}

	private name(index: number): string {
		const pointer = this.wasm.cl_name(index);
		const memory = new Uint8Array(this.wasm.memory.buffer);
		const end = memory.indexOf(0, pointer);
		return this.decoder.decode(memory.subarray(pointer, end));
	}
}
