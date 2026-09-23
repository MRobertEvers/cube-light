import type { CardNameIndex, CardNameIndexBuilder } from '../../engine/ports';
import { NameIndexWasm } from './name-index-wasm';

/** Instantiates the card-name index WebAssembly module with its data. */
export class WasmNameIndexBuilder implements CardNameIndexBuilder {
	async build(moduleBytes: ArrayBuffer, indexBytes: Uint8Array): Promise<CardNameIndex> {
		const module = await WebAssembly.instantiate(moduleBytes, {
			env: { emscripten_notify_memory_growth: function () {} }
		});
		return new NameIndexWasm(module.instance, indexBytes);
	}
}
