import { randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import type { ImageVariant } from './card-images';

/** Copies up to the mirror at once; an image downloaded while all are busy stays only here. */
const PUSHES = 4;
/** A mirror slower than this (a NAS gone away) is passed over for Scryfall. */
const READ_TIMEOUT_MS = 15 * 1000;

/**
 * A second art cache behind this machine's (TORIMTG_ART_MIRROR, as torimtgd's --art-mirror): the
 * NAS's art folder behind a local one, in the same layout (3rd/artcache/FORMAT.md,
 * `<root>/<variant>/<name>.jpg`). An image the local cache lacks is copied from here before
 * Scryfall is asked, and one Scryfall brings is copied up here in the background, written beside
 * its place and renamed into it, so other machines never read half a file.
 */
export class ArtMirror {
	readonly root: string;
	/** Images taken from the mirror and given to it since the server started. */
	fromMirror = 0;
	toMirror = 0;
	private pushing = 0;

	constructor(root: string) {
		this.root = path.resolve(root);
	}

	/** The mirror's copy, or null when it has none, it is not a JPEG, or the mirror is too slow. */
	async read(variant: ImageVariant, name: string): Promise<Buffer | null> {
		let timer: NodeJS.Timeout | undefined;
		const timeout = new Promise<null>((resolve) => {
			timer = setTimeout(() => resolve(null), READ_TIMEOUT_MS);
		});
		try {
			const image = await Promise.race([
				fs.readFile(this.file(variant, name)).catch((error) => {
					if ((error as NodeJS.ErrnoException).code !== 'ENOENT')
						console.warn(`Art mirror: unable to read ${variant}/${name}`, error);
					return null;
				}),
				timeout
			]);
			if (!image) return null;
			// A JPEG starts FF D8; anything else is a broken copy, and Scryfall is asked instead.
			if (image.length < 4 || image[0] !== 0xff || image[1] !== 0xd8) return null;
			this.fromMirror++;
			return image;
		} finally {
			if (timer) clearTimeout(timer);
		}
	}

	/** Gives the mirror an image in the background; nothing when it has it or every push is busy. */
	push(variant: ImageVariant, name: string, image: Buffer): void {
		if (this.pushing >= PUSHES) return;
		this.pushing++;
		const instance = this;
		(async function () {
			const final = instance.file(variant, name);
			const part = `${final}.${randomBytes(8).toString('hex')}.part`;
			try {
				// A share not mounted yet (at boot, before login) is passed over, never made here.
				if (!(await fs.stat(instance.root).then((info) => info.isDirectory(), () => false))) return;
				if (await fs.stat(final).then(() => true, () => false)) return;
				await fs.mkdir(path.dirname(final), { recursive: true });
				await fs.writeFile(part, image);
				await fs.rename(part, final);
				instance.toMirror++;
			} catch (error) {
				console.warn(`Art mirror: unable to copy ${variant}/${name} to ${instance.root}`, error);
				await fs.rm(part, { force: true }).catch(() => undefined);
			} finally {
				instance.pushing--;
			}
		})();
	}

	private file(variant: ImageVariant, name: string): string {
		if (!/^[0-9a-f-]+$/.test(name)) throw new Error('Invalid image name');
		return path.join(this.root, variant, `${name}.jpg`);
	}
}
