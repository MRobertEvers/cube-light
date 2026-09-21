type NameIndexExports = {
	memory: WebAssembly.Memory;
	malloc(size: number): number;
	free(pointer: number): void;
	nm_wasm_load(pointer: number, size: number): number;
	nm_wasm_has_prefix(pointer: number, size: number): number;
	nm_wasm_find_prefix(
		pointer: number,
		size: number,
		output: number,
		capacity: number
	): number;
	nm_wasm_name_ptr(index: number): number;
};

/** Search the compact C name index through its WebAssembly exports. */
export class NameIndexWasm {
	private readonly wasm: NameIndexExports;
	private readonly encoder = new TextEncoder();
	private readonly decoder = new TextDecoder();
	private queryPointer = 0;
	private queryCapacity = 0;
	private resultPointer = 0;
	private resultCapacity = 0;

	constructor(instance: WebAssembly.Instance, blob: Uint8Array) {
		this.wasm = instance.exports as unknown as NameIndexExports;
		const pointer = this.wasm.malloc(blob.length);
		if (!pointer) throw new Error('Could not allocate name index memory');
		new Uint8Array(this.wasm.memory.buffer, pointer, blob.length).set(blob);
		if (!this.wasm.nm_wasm_load(pointer, blob.length)) {
			this.wasm.free(pointer);
			throw new Error('Invalid name index');
		}
	}

	private setQuery(query: string): number {
		const bytes = this.encoder.encode(query);
		if (bytes.length + 1 > this.queryCapacity) {
			if (this.queryPointer) this.wasm.free(this.queryPointer);
			this.queryCapacity = Math.max(
				bytes.length + 1,
				this.queryCapacity * 2,
				32
			);
			this.queryPointer = this.wasm.malloc(this.queryCapacity);
			if (!this.queryPointer)
				throw new Error('Could not allocate query memory');
		}
		new Uint8Array(
			this.wasm.memory.buffer,
			this.queryPointer,
			bytes.length
		).set(bytes);
		return bytes.length;
	}

	private hasPrefix(prefix: string): boolean {
		const length = this.setQuery(prefix);
		return !!this.wasm.nm_wasm_has_prefix(this.queryPointer, length);
	}

	private completions(prefix: string, limit: number): string[] {
		if (limit > this.resultCapacity) {
			if (this.resultPointer) this.wasm.free(this.resultPointer);
			this.resultCapacity = Math.max(limit, this.resultCapacity * 2, 16);
			this.resultPointer = this.wasm.malloc(this.resultCapacity * 4);
			if (!this.resultPointer)
				throw new Error('Could not allocate result memory');
		}
		const length = this.setQuery(prefix);
		const count = this.wasm.nm_wasm_find_prefix(
			this.queryPointer,
			length,
			this.resultPointer,
			limit
		);
		const indices = new Uint32Array(
			this.wasm.memory.buffer,
			this.resultPointer,
			count
		);
		const names: string[] = [];
		for (let i = 0; i < count; i++) {
			const pointer = this.wasm.nm_wasm_name_ptr(indices[i]);
			const memory = new Uint8Array(this.wasm.memory.buffer);
			let end = pointer;
			while (memory[end]) end++;
			names.push(this.decoder.decode(memory.subarray(pointer, end)));
		}
		return names;
	}

	getFirstNMatches(limit: number, base: string): string[] {
		if (limit <= 0) return [];
		let level = [''];
		for (const char of base) {
			const keys = Array.from(
				new Set([char.toUpperCase(), char.toLowerCase()])
			);
			const next: string[] = [];
			for (const prefix of level) {
				for (const key of keys) {
					const candidate = prefix + key;
					if (this.hasPrefix(candidate)) next.push(candidate);
				}
				for (const ignored of [',', "'"]) {
					if (ignored === char || !this.hasPrefix(prefix + ignored))
						continue;
					for (const key of keys) {
						const candidate = prefix + ignored + key;
						if (this.hasPrefix(candidate)) next.push(candidate);
					}
				}
			}
			level = next;
			if (!level.length) return [];
		}
		const results: string[] = [];
		for (const prefix of level) {
			results.push(...this.completions(prefix, limit - results.length));
			if (results.length >= limit) break;
		}
		return results;
	}
}
