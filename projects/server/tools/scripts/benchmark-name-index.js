#!/usr/bin/env node
/* Run with: npm run benchmark:name-index (after npm run build). */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const zlib = require('zlib');
const { DatabaseSync } = require('node:sqlite');

const root = path.resolve(__dirname, '../..');
const databasePath = path.join(root, 'src/assets/AllPrintings.sqlite');
const jsonPath = process.env.CUBE_NAME_BENCH_JSON ||
	path.join(os.tmpdir(), `cube-light-name-lookup-${process.pid}.json`);
const indexPath = path.join(root, 'build/src/public/NameLookup.nmi');
const wasmPath = path.join(root, 'build/src/public/name-index.wasm');

// Transpile the real client lookup modules so this benchmark exercises the
// implementation used in the browser, without requiring a browser test runner.
function loadClientTypescript(mode) {
	const ts = require('typescript');
	require.extensions['.ts'] = (module, filename) => {
		const source = fs.readFileSync(filename, 'utf8');
		const compiled = ts.transpileModule(source, {
			compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 }
		});
		module._compile(compiled.outputText, filename);
	};
	const client = path.resolve(root, '../clientv2/src/utils/lookup-tables');
	return mode === 'json'
		? require(path.join(client, 'iter-matches-in-lookup-tree.ts')).getFirstNMatchesInLookupTree
		: require(path.join(client, 'name-index-wasm.ts')).NameIndexWasm;
}

function memory() {
	const { rss, heapUsed, external, arrayBuffers } = process.memoryUsage();
	return { rss, heapUsed, external, arrayBuffers };
}

async function worker(mode) {
	const queries = JSON.parse(fs.readFileSync(0, 'utf8'));
	const implementation = loadClientTypescript(mode);
	if (global.gc) { global.gc(); global.gc(); }
	const before = memory();
	const start = process.hrtime.bigint();
	let lookup;
	let linearMemory = 0;
	if (mode === 'json') {
		const tree = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
		lookup = (query) => implementation(10, query, tree);
	} else {
		const module = await WebAssembly.instantiate(fs.readFileSync(wasmPath), {
			env: { emscripten_notify_memory_growth: () => {} }
		});
		const index = new implementation(module.instance, fs.readFileSync(indexPath));
		lookup = (query) => index.getFirstNMatches(10, query);
		linearMemory = module.instance.exports.memory.buffer.byteLength;
	}
	const initMs = Number(process.hrtime.bigint() - start) / 1e6;
	if (global.gc) global.gc();
	const after = memory();
	const results = queries.map(lookup);
	for (let round = 0; round < 3; round++) queries.forEach(lookup);
	const samples = [];
	for (let round = 0; round < 20; round++) {
		for (const query of queries) {
			const t0 = process.hrtime.bigint();
			lookup(query);
			samples.push(Number(process.hrtime.bigint() - t0) / 1000);
		}
	}
	samples.sort((a, b) => a - b);
	const sum = samples.reduce((a, b) => a + b, 0);
	process.stdout.write(JSON.stringify({
		mode, results, initMs, before, after, linearMemory,
		queryCount: samples.length,
		meanUs: sum / samples.length,
		p50Us: samples[Math.floor(samples.length * 0.5)],
		p95Us: samples[Math.floor(samples.length * 0.95)]
	}));
}

function makeQueries(tree) {
	const names = [];
	function visit(branch, prefix) {
		if (Object.prototype.hasOwnProperty.call(branch, '$')) names.push(prefix);
		for (const [char, child] of Object.entries(branch)) {
			if (char !== '$') visit(child, prefix + char);
		}
	}
	visit(tree, '');
	const queries = new Set(['', 'a', 'A', 'Black', "thalia'", 'THALIAS', 'forest', 'zzzz', 'Æ', 'É']);
	const verificationQueries = new Set();
	for (let i = 0; i < 300; i++) {
		const name = names[(i * 7919) % names.length];
		const prefix = Array.from(name).slice(0, 2 + i % 7).join('');
		queries.add(i % 3 ? prefix.toLowerCase() : prefix);
		if (i % 13 === 0) queries.add(prefix.replace(/[',]/g, ''));
	}
	for (const name of names) {
		const chars = Array.from(name);
		for (let length = 1; length <= Math.min(5, chars.length); length++) {
			const prefix = chars.slice(0, length).join('');
			verificationQueries.add(prefix);
			verificationQueries.add(prefix.toLowerCase());
			if (/[',]/.test(prefix)) verificationQueries.add(prefix.replace(/[',]/g, ''));
		}
	}
	return { queries: Array.from(queries), verificationQueries, nameCount: names.length };
}

function runWorker(mode, queries) {
	const result = spawnSync(process.execPath, ['--expose-gc', __filename, '--worker', mode], {
		input: JSON.stringify(queries), encoding: 'utf8', maxBuffer: 20 * 1024 * 1024,
		env: { ...process.env, CUBE_NAME_BENCH_JSON: jsonPath }
	});
	if (result.status !== 0) throw new Error(`${mode} benchmark failed: ${result.stderr}`);
	return JSON.parse(result.stdout);
}

function mb(bytes) { return (bytes / 1024 / 1024).toFixed(2); }
function gzipSize(filename) { return zlib.gzipSync(fs.readFileSync(filename)).length; }
function row(label, bytes) {
	const filename = label === 'JSON' ? jsonPath : label === 'Index' ? indexPath : wasmPath;
	return `| ${label} | ${bytes.toLocaleString()} | ${gzipSize(filename).toLocaleString()} |`;
}

function buildLegacyJson() {
	const database = new DatabaseSync(databasePath, { readOnly: true });
	const tree = {};
	for (const { name } of database.prepare('SELECT name FROM cards ORDER BY rowid').all()) {
		let branch = tree;
		for (const char of name) {
			if (!branch[char]) branch[char] = {};
			branch = branch[char];
		}
		branch.$ = {};
	}
	database.close();
	fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
	fs.writeFileSync(jsonPath, JSON.stringify(tree));
	return tree;
}

async function main() {
	if (process.argv[2] === '--worker') return worker(process.argv[3]);
	const tree = buildLegacyJson();
	const { queries, verificationQueries, nameCount } = makeQueries(tree);
	const json = runWorker('json', queries);
	const wasm = runWorker('wasm', queries);
	let mismatches = 0;
	for (let i = 0; i < queries.length; i++) {
		if (JSON.stringify(json.results[i]) !== JSON.stringify(wasm.results[i])) {
			mismatches++;
			if (mismatches <= 5) console.error(`Mismatch for ${JSON.stringify(queries[i])}:`, json.results[i], wasm.results[i]);
		}
	}
	const legacy = loadClientTypescript('json');
	const NameIndexWasm = loadClientTypescript('wasm');
	const module = await WebAssembly.instantiate(fs.readFileSync(wasmPath), {
		env: { emscripten_notify_memory_growth: () => {} }
	});
	const index = new NameIndexWasm(module.instance, fs.readFileSync(indexPath));
	let verificationMismatches = 0;
	for (const query of verificationQueries) {
		if (JSON.stringify(legacy(10, query, tree)) !==
			JSON.stringify(index.getFirstNMatches(10, query))) verificationMismatches++;
	}
	const delta = (result, key) => mb(result.after[key] - result.before[key]);
	const report = [
		`# Name lookup benchmark`,
		``,
		`Measured on ${process.platform}/${process.arch}, Node ${process.version}. ${queries.length} distinct queries from the ${nameCount.toLocaleString()}-name SQLite corpus; ${json.queryCount.toLocaleString()} timed lookups per implementation after warmup. Both runs used separate processes with \`--expose-gc\`. The JSON baseline is generated only for this benchmark.`,
		``,
		`## Artifact size`,
		``,
		`| Artifact | Raw bytes | Gzip bytes |`,
		`| --- | ---: | ---: |`,
		row('JSON', fs.statSync(jsonPath).size),
		row('Index', fs.statSync(indexPath).size),
		row('Wasm', fs.statSync(wasmPath).size),
		`| Index + Wasm | ${(fs.statSync(indexPath).size + fs.statSync(wasmPath).size).toLocaleString()} | ${(gzipSize(indexPath) + gzipSize(wasmPath)).toLocaleString()} |`,
		``,
		`## Runtime`,
		``,
		`| Implementation | Init ms | RSS delta MiB | JS heap delta MiB | External delta MiB | Wasm linear memory MiB | Mean query µs | P50 µs | P95 µs |`,
		`| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |`,
		... [json, wasm].map(r => `| ${r.mode} | ${r.initMs.toFixed(2)} | ${delta(r, 'rss')} | ${delta(r, 'heapUsed')} | ${delta(r, 'external')} | ${mb(r.linearMemory)} | ${r.meanUs.toFixed(2)} | ${r.p50Us.toFixed(2)} | ${r.p95Us.toFixed(2)} |`),
		``,
		`Result mismatches: ${mismatches} of ${queries.length}.`,
		`Prefix verification mismatches: ${verificationMismatches} of ${verificationQueries.size}. This covers the first five characters of every name, lowercase variants, and omitted punctuation.`,
		``,
		`The native node-gyp addon builds the index from SQLite. WebAssembly runs lookups in the browser. Initialization includes reading and parsing the generated JSON baseline or instantiating WebAssembly and loading the binary index. Memory deltas are process measurements and can vary with GC and the host allocator.`,
		``
	].join('\n');
	console.log(report);
	if (!mismatches && !verificationMismatches && process.argv.includes('--write-report')) {
		const output = path.join(root, 'benchmarks/name-index.md');
		fs.mkdirSync(path.dirname(output), { recursive: true });
		fs.writeFileSync(output, report);
	}
	fs.rmSync(jsonPath, { force: true });
	if (mismatches || verificationMismatches) process.exitCode = 1;
}

main().catch(error => {
	if (process.argv[2] !== '--worker') fs.rmSync(jsonPath, { force: true });
	console.error(error);
	process.exitCode = 1;
});
