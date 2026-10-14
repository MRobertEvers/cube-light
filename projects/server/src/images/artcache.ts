import path from 'path';

/**
 * The shared card-art cache (3rd/artcache, FORMAT.md at the repository root): one folder of art,
 * perhaps on a NAS that torimtgd and other machines fill too, and this machine's SQLite index of
 * it. The addon (native/artcache_addon.c) wraps the C library; reading and writing the image files
 * is left to the host. Times are whole seconds passed in by the caller.
 */

/** artcache's kinds of file: Scryfall's JPEGs, its full card PNG, and height maps. */
export type ArtCacheKind =
	| 'art_crop'
	| 'small'
	| 'normal'
	| 'large'
	| 'png'
	| 'depth';

export type ArtCacheState = 'absent' | 'present' | 'stale' | 'claimed' | 'failed';

/** An open cache. Versions are null for files that have none (every Scryfall image). */
export interface ArtCacheHandle {
	/** Gives up this handle's claims; any later call throws. */
	close(): void;
	/** The folder, '/' separated. */
	root(): string;
	indexPath(): string;
	/** `<root>/<kind>/<name>.<ext>`, or null for a bad kind or name. */
	path(kind: ArtCacheKind, name: string): string | null;
	lookup(
		kind: ArtCacheKind,
		name: string,
		version: string | null,
		retrySeconds: number,
		nowSeconds: number
	): ArtCacheState;
	/** The version of the file the index knows ('' none), or null when it knows no file. */
	fileVersion(kind: ArtCacheKind, name: string): string | null;
	/** The file was gone or unreadable: the index forgets it. */
	forget(kind: ArtCacheKind, name: string): void;
	/** Whether this handle may make the file now: nobody else on this machine is, and it is not there. */
	claim(
		kind: ArtCacheKind,
		name: string,
		version: string | null,
		leaseSeconds: number,
		nowSeconds: number
	): boolean;
	release(kind: ArtCacheKind, name: string): void;
	/** Where to write the file before commit (its folder made), or null for a bad kind or name. */
	tempPath(kind: ArtCacheKind, name: string): string | null;
	/** Renames tempPath into place and records it; false when that fails (temp is removed). */
	commit(
		kind: ArtCacheKind,
		name: string,
		tempPath: string,
		version: string | null,
		nowSeconds: number
	): boolean;
	/** Records a failed attempt, ends the claim, and removes tempPath. */
	fail(
		kind: ArtCacheKind,
		name: string,
		tempPath: string | null,
		version: string | null,
		error: string | null,
		nowSeconds: number
	): void;
	attempts(kind: ArtCacheKind, name: string, version: string | null): number;
	/** A fact this machine keeps about the file, dropped when the file changes. */
	infoGet(kind: ArtCacheKind, name: string, key: string): string | null;
	infoSet(kind: ArtCacheKind, name: string, key: string, value: string): boolean;
}

interface ArtCacheAddon {
	/** Opens (creating when missing) the folder and its index; throws with the reason. */
	open(root: string, indexPath: string | null): ArtCacheHandle;
	/** $TORIMTG_ART_CACHE, else $TMG_SCRYFALL_CACHE, else <per-user data>/torimtg/scryfall_cache. */
	defaultRoot(): string | null;
	/** $TORIMTG_ART_INDEX, else <per-user data>/torimtg/artcache/<hash of root>.sqlite. */
	defaultIndex(root: string): string | null;
	nameOk(kind: ArtCacheKind, name: string): boolean;
}

// node-gyp builds into build/Release beside tsc's build/src.
export const artcache = require(path.join(
	__dirname,
	'../../Release/artcache.node'
)) as ArtCacheAddon;

export function nowSeconds(): number {
	return Math.floor(Date.now() / 1000);
}
