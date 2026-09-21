import { API_URI } from '../config/api-url';
import { fetchTimeout } from './utils';
import { NameIndexWasm } from '../utils/lookup-tables/name-index-wasm';

// Cache this globally since it may be expensive.
// TODO: Better way to do this?

let NAME_LOOKUP: Promise<NameIndexWasm> | undefined;

export function fetchAPINameLookup(): Promise<NameIndexWasm> {
	if (!NAME_LOOKUP) {
		NAME_LOOKUP = (async () => {
			const [moduleResponse, indexResponse] = await Promise.all([
				fetchTimeout(`${API_URI}/suggest/card-names/wasm`),
				fetchTimeout(`${API_URI}/suggest/card-names/index`)
			]);
			if (!moduleResponse.ok || !indexResponse.ok) {
				throw new Error('Could not load card name index');
			}
			const [moduleBytes, indexBytes] = await Promise.all([
				moduleResponse.arrayBuffer(),
				indexResponse.arrayBuffer()
			]);
			const module = await WebAssembly.instantiate(moduleBytes, {
				env: { emscripten_notify_memory_growth: () => {} }
			});
			return new NameIndexWasm(module.instance, new Uint8Array(indexBytes));
		})();
		NAME_LOOKUP.catch(() => { NAME_LOOKUP = undefined; });
	}
	return NAME_LOOKUP;
}
