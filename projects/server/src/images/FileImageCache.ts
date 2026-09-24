import { promises as fs } from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import { IMAGE_META_VERSION, type ImageMeta } from '@torimtg/core';
import { ImageCache } from './ImageCache';

/**
 * Card images on disk as `<variant>/<id>.jpg`, each with its metadata sidecar
 * `<variant>/<id>.json` beside it once the image has been measured.
 */
export class FileImageCache implements ImageCache {
	constructor(private readonly directory: string) {}

	async get(key: string): Promise<Buffer | null> {
		return this.read(this.filePath(key, 'jpg'));
	}

	async set(key: string, image: Buffer): Promise<void> {
		await this.write(this.filePath(key, 'jpg'), image);
	}

	async getMeta(key: string): Promise<ImageMeta | null> {
		const sidecar = await this.read(this.filePath(key, 'json'));
		if (!sidecar) return null;
		try {
			const meta = JSON.parse(sidecar.toString('utf8')) as ImageMeta;
			// A sidecar from an older measurer is measured again.
			return meta.version === IMAGE_META_VERSION ? meta : null;
		} catch {
			return null;
		}
	}

	async setMeta(key: string, meta: ImageMeta): Promise<void> {
		await this.write(
			this.filePath(key, 'json'),
			Buffer.from(JSON.stringify(meta))
		);
	}

	private async read(file: string): Promise<Buffer | null> {
		try {
			return await fs.readFile(file);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
			throw error;
		}
	}

	/** Writes through a temporary file, so readers never see half a file. */
	private async write(destination: string, data: Buffer): Promise<void> {
		await fs.mkdir(path.dirname(destination), { recursive: true });
		const temporary = `${destination}.${randomBytes(8).toString('hex')}.tmp`;
		try {
			await fs.writeFile(temporary, data, { flag: 'wx' });
			await fs.rename(temporary, destination);
		} catch (error) {
			await fs.unlink(temporary).catch(() => undefined);
			throw error;
		}
	}

	private filePath(key: string, extension: 'jpg' | 'json'): string {
		// Keys are validated at the storage boundary so callers cannot escape the cache directory.
		if (
			!/^(small|normal|large|art_crop)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
				key
			)
		) {
			throw new Error('Invalid image cache key');
		}
		return path.join(this.directory, `${key}.${extension}`);
	}
}
