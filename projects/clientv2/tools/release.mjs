import { execFileSync } from 'node:child_process';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { releaseDate } from './build-info.mjs';

/**
 * `npm run release`: builds the production app and replaces `release/` with it. The dev
 * server serves that folder's ShellWorker, which precaches the release and loads it on
 * every device unless the device is in development mode.
 *
 * A release is named for its day, YYYY-MM-DD; a second release on the same day is
 * YYYY-MM-DD.2, and so on. Commit `release/` and tag the commit `release-<name>`.
 */
const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(root, 'dist');
const release = path.join(root, 'release');

async function main() {
	const name = await nextName(releaseDate(new Date()));
	execFileSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit', env: Object.assign({}, process.env, { RELEASE_NAME: name }) });
	await rm(release, { recursive: true, force: true });
	await mkdir(release);
	// Only what the build makes; public/ files (icons, manifest, OCR models) the dev server serves itself.
	await cp(path.join(dist, 'index.html'), path.join(release, 'index.html'));
	await cp(path.join(dist, 'sw.js'), path.join(release, 'sw.js'));
	await cp(path.join(dist, 'assets'), path.join(release, 'assets'), { recursive: true });
	const html = await readFile(path.join(release, 'index.html'), 'utf8');
	if (!html.includes('/assets/')) throw new Error('release/index.html does not reference /assets/');
	await writeFile(path.join(release, 'release.json'), JSON.stringify({ name, time: new Date().toISOString() }, null, '\t') + '\n');
	console.log(`\nRelease ${name} written to release/. Commit it and tag the commit release-${name}.`);
}

/** The first of `date`, `date.2`, `date.3`… with no release tag yet. */
async function nextName(date) {
	const tags = new Set(execFileSync('git', ['tag', '--list', `release-${date}*`], { cwd: root, encoding: 'utf8' }).split('\n'));
	let name = date;
	for (let count = 2; tags.has(`release-${name}`); count++) name = `${date}.${count}`;
	return name;
}

await main();
