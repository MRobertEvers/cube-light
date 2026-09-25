import { execFileSync } from 'node:child_process';

/**
 * What the app shows on the Profile page about the build it is running, compiled in as
 * `__BUILD_INFO__` (see src/domain/models/build-info.ts).
 * - A dev server build names the checked-out commit, its time, and whether the working
 *   tree has uncommitted changes.
 * - A production build is a release, named for the day it was built (YYYY-MM-DD), or for
 *   RELEASE_NAME when `npm run release` sets it.
 * @param {'serve' | 'build'} command
 * @param {string} root
 */
export function buildInfo(command, root) {
	const commit = git(root, ['rev-parse', '--short', 'HEAD']);
	if (command === 'serve') {
		return {
			channel: 'development',
			name: null,
			time: git(root, ['log', '-1', '--format=%cI']),
			commit,
			modified: git(root, ['status', '--porcelain']) !== ''
		};
	}
	const now = new Date();
	return {
		channel: 'release',
		name: process.env.RELEASE_NAME || releaseDate(now),
		time: now.toISOString(),
		commit,
		modified: false
	};
}

/** The local calendar date as YYYY-MM-DD. */
export function releaseDate(date) {
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${date.getFullYear()}-${month}-${day}`;
}

/** @param {string} root @param {string[]} args */
function git(root, args) {
	try {
		return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
	} catch {
		return '';
	}
}
