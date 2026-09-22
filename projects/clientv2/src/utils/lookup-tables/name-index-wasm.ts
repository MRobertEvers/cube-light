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

export type NameIndexSearchCursor = {
	/** Updates the current query, reusing its longest unchanged prefix. */
	getFirstNMatches(base: string): string[];
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

	private extendLevel(level: string[], char: string): string[] {
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
		return next;
	}

	private completeLevel(level: string[], limit: number): string[] {
		const results: string[] = [];
		for (const prefix of level) {
			results.push(...this.completions(prefix, limit - results.length));
			if (results.length >= limit) break;
		}
		return results;
	}

	/**
	 * A stateful prefix cursor for live inputs. Appending one character advances one
	 * level; backspacing restores the already-computed parent level.
	 */
	createSearchCursor(limit: number): NameIndexSearchCursor {
		const index = this;
		let characters: string[] = [];
		let levels: string[][] = [['']];

		return {
			getFirstNMatches: function (base: string) {
				if (limit <= 0) return [];
				const nextCharacters = Array.from(base);
				let common = 0;
				while (
					common < characters.length &&
					common < nextCharacters.length &&
					characters[common] === nextCharacters[common]
				)
					common++;
				levels.length = common + 1;
				for (
					let position = common;
					position < nextCharacters.length;
					position++
				) {
					levels.push(
						index.extendLevel(
							levels[position],
							nextCharacters[position]
						)
					);
				}
				characters = nextCharacters;
				return index.completeLevel(levels[levels.length - 1], limit);
			}
		};
	}

	getFirstNMatches(limit: number, base: string): string[] {
		return this.createSearchCursor(limit).getFirstNMatches(base);
	}
}
