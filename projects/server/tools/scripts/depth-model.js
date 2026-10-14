// The server's models (models/models.json): `verify` checks each file's size and SHA-256;
// `install` also restores any that is missing or corrupt (a checkout without them, a Git LFS
// pointer, a broken copy) from its pinned source, checked before it is put in place.
const { createHash } = require('node:crypto');
const { createReadStream, createWriteStream } = require('node:fs');
const { mkdir, readFile, rename, rm, stat } = require('node:fs/promises');
const path = require('node:path');
const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');

const MODELS = path.join(__dirname, '../../models');

/** @param {string} file */
async function sha256(file) {
	const digest = createHash('sha256');
	for await (const chunk of createReadStream(file, { highWaterMark: 8 * 1024 * 1024 })) digest.update(chunk);
	return digest.digest('hex');
}

/**
 * @typedef {Object} ModelFile
 * @property {number} bytes
 * @property {string} sha256
 * @property {string} source
 */

/** @param {string} file @param {ModelFile} expected */
async function valid(file, expected) {
	try {
		return (await stat(file)).size === expected.bytes && (await sha256(file)) === expected.sha256;
	} catch {
		return false;
	}
}

/** @param {string} file @param {ModelFile} expected */
async function download(file, expected) {
	const temporary = `${file}.download-${process.pid}`;
	try {
		const response = await fetch(expected.source);
		if (!response.ok || !response.body) throw new Error(`${response.status} from ${expected.source}`);
		await mkdir(path.dirname(file), { recursive: true });
		await pipeline(Readable.fromWeb(response.body), createWriteStream(temporary));
		if (!(await valid(temporary, expected))) throw new Error(`checksum mismatch for ${expected.source}`);
		await rename(temporary, file);
	} finally {
		await rm(temporary, { force: true });
	}
}

async function main() {
	const command = process.argv[2] === undefined ? 'verify' : process.argv[2];
	if (command !== 'verify' && command !== 'install') throw new Error('Usage: depth-model.js verify|install');
	/** @type {Record<string, ModelFile>} */
	const manifest = JSON.parse(await readFile(path.join(MODELS, 'models.json'), 'utf8'));
	let bad = 0;
	for (const [name, expected] of Object.entries(manifest)) {
		const file = path.join(MODELS, name);
		if (await valid(file, expected)) continue;
		if (command === 'verify') {
			console.error(`Missing or corrupt: models/${name} (npm run depth-model -- install restores it)`);
			bad++;
			continue;
		}
		console.log(`Restoring models/${name} from ${expected.source}`);
		await download(file, expected);
	}
	if (bad) process.exitCode = 1;
	else console.log(`Server models ${command === 'verify' ? 'verified' : 'installed'}.`);
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
