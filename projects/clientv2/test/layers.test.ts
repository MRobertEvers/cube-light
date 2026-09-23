import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Enforces the layer plan: imports point down only, the UI reaches data only through
 * Redux and the ToriMTGEngine, and workers are started only by their clients, which the
 * engine reaches through its ports.
 */

const ROOT = path.resolve('src');

type Layer =
	| 'app' | 'ui:pages' | 'ui:features' | 'ui:kit' | 'redux' | 'client' | 'protocol'
	| 'worker' | 'engine' | 'platform' | 'domain' | 'asset';

/** May import: each layer lists the layers it is allowed to depend on. */
const ALLOWED: Record<Layer, Layer[]> = {
	// The composition root builds the engine, its adapters and the worker clients.
	'app': ['app', 'ui:pages', 'ui:features', 'ui:kit', 'redux', 'engine', 'platform', 'client', 'protocol', 'domain', 'asset'],
	'ui:pages': ['ui:pages', 'ui:features', 'ui:kit', 'redux', 'domain', 'asset'],
	'ui:features': ['ui:features', 'ui:kit', 'redux', 'domain', 'asset'],
	'ui:kit': ['ui:kit', 'redux', 'domain', 'asset'],
	// Thunks receive the ToriMTGEngine; they never see a worker or an adapter.
	'redux': ['redux', 'engine', 'domain'],
	'engine': ['engine', 'domain'],
	// Below the port boundary: adapters and worker clients implement engine ports.
	'platform': ['platform', 'client', 'protocol', 'engine', 'domain', 'asset'],
	'client': ['client', 'protocol', 'engine', 'domain'],
	'protocol': ['protocol', 'domain'],
	// Worker entries run in their own thread; SyncWorker is a composition root for engine/sync.
	'worker': ['worker', 'protocol', 'client', 'engine', 'platform', 'domain', 'asset'],
	'domain': ['domain'],
	'asset': ['asset']
};

const WORKER_PARTS: Record<string, Layer> = { worker: 'worker', client: 'client', protocol: 'protocol' };

/** The layer a file belongs to, from the folder it lives in. */
export function layerOf(file: string): Layer {
	const f = file.split(path.sep).join('/');
	if (/\.(css|png|svg|jpe?g|webp|wasm|json)$/.test(f) || f.startsWith('assets/')) return 'asset';
	if (f === 'index.tsx' || f.startsWith('app/')) return 'app';
	if (f.startsWith('domain/')) return 'domain';
	if (f.startsWith('engine/')) return 'engine';
	if (f.startsWith('platform/')) return 'platform';
	if (f.startsWith('redux/')) return 'redux';
	if (f.startsWith('ui/pages/')) return 'ui:pages';
	if (f.startsWith('ui/features/')) return 'ui:features';
	if (f.startsWith('ui/kit/')) return 'ui:kit';
	const part = /^workers\/[^/]+\/[^/]+\.(worker|client|protocol)\.ts$/.exec(f);
	if (part) return WORKER_PARTS[part[1]];
	throw new Error(`No layer for ${f}; put it in a layer folder (see test/layers.test.ts).`);
}

/** `spawn` is a `new URL(…)` reference that starts a worker, not an import of its code. */
type Edge = { from: string; to: string; spawn: boolean };

function sourceFiles(): string[] {
	const files: string[] = [];
	(function walk(dir: string) {
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) walk(full);
			else if (/\.(ts|tsx|js)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) files.push(full);
		}
	})(ROOT);
	return files;
}

function resolveImport(from: string, specifierWithQuery: string): string | null {
	const specifier = specifierWithQuery.split('?')[0];
	let base: string;
	if (specifier.startsWith('src/')) base = path.join(ROOT, specifier.slice(4));
	else if (specifier.startsWith('.')) base = path.resolve(path.dirname(from), specifier);
	else return null;
	for (const candidate of [base, base + '.ts', base + '.tsx', base + '.js', path.join(base, 'index.ts'), path.join(base, 'index.tsx')])
		if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
	return null;
}

function edgesOf(files: string[], unresolved: string[]): Edge[] {
	const edges: Edge[] = [];
	const pattern = /(?:import|export)\s+(?:type\s+)?(?:[^'";]*?\sfrom\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|new URL\(\s*['"]([^'"]+)['"]/g;
	for (const file of files) {
		const text = fs.readFileSync(file, 'utf8');
		for (const match of text.matchAll(pattern)) {
			const specifier = match[1] || match[2] || match[3];
			const target = resolveImport(file, specifier);
			if (!target) {
				if (/^(\.|src\/)/.test(specifier)) unresolved.push(`${path.relative(ROOT, file)} ⇒ ${specifier}`);
				continue;
			}
			edges.push({ from: path.relative(ROOT, file), to: path.relative(ROOT, target), spawn: !!match[3] });
		}
	}
	return edges;
}

function violations(): string[] {
	const files = sourceFiles();
	const unresolved: string[] = [];
	const edges = edgesOf(files, unresolved);
	const found = new Set<string>(unresolved.map((item) => `unresolved: ${item}`));
	for (const edge of edges) {
		const from = layerOf(edge.from), to = layerOf(edge.to);
		if (edge.spawn) {
			// A client may start the worker entry in its own folder, and nothing else may start a worker.
			const own = from === 'client' && to === 'worker' && path.dirname(edge.from) === path.dirname(edge.to);
			if (!own && to === 'worker') found.add(`spawn ${from} → ${to}: ${edge.from} ⇒ ${edge.to}`);
			continue;
		}
		if (!ALLOWED[from].includes(to)) found.add(`import ${from} → ${to}: ${edge.from} ⇒ ${edge.to}`);
	}
	// Only a worker client may start a worker.
	for (const file of files) {
		const relative = path.relative(ROOT, file);
		const text = fs.readFileSync(file, 'utf8');
		if (/new (Shared)?Worker\(|serviceWorker\.register\(/.test(text) && layerOf(relative) !== 'client')
			found.add(`start: ${relative} starts a worker outside a *.client.ts`);
	}
	return [...found].sort();
}

test('imports follow the layer plan', () => {
	const found = violations();
	assert.deepEqual(found, [], `Layer violations:\n${found.join('\n')}`);
});
