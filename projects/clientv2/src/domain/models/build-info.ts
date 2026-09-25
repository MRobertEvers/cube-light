/**
 * The build this page is running, compiled in by tools/build-info.mjs.
 * - release: a production build, named for its day (YYYY-MM-DD). The service worker serves
 *   it by default, and whenever the development server cannot be reached.
 * - development: served by the development server from the checked-out commit.
 */
export type BuildInfo = {
	channel: 'release' | 'development';
	/** The release's name, YYYY-MM-DD; null for development. */
	name: string | null;
	/** ISO time: when a release was built, or when a development commit was made. */
	time: string;
	/** Short hash of the commit it was built from; empty when git was unavailable. */
	commit: string;
	/** Development only: the working tree had uncommitted changes when the server started. */
	modified: boolean;
};

/**
 * Which build the service worker loads pages from.
 * - release: the last release, from this device's cache.
 * - development: the development server, falling back to the release when it cannot be reached.
 */
export type ShellMode = 'release' | 'development';
