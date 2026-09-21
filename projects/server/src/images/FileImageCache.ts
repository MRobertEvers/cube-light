import { promises as fs } from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import { ImageCache } from './ImageCache';

export class FileImageCache implements ImageCache {
	constructor(private readonly directory: string) {}

	async get(key: string): Promise<Buffer | null> {
		try {
			return await fs.readFile(this.filePath(key));
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
			throw error;
		}
	}

	async set(key: string, image: Buffer): Promise<void> {
		const destination = this.filePath(key);
		await fs.mkdir(path.dirname(destination), { recursive: true });
		const temporary = `${destination}.${randomBytes(8).toString('hex')}.tmp`;
		try {
			await fs.writeFile(temporary, image, { flag: 'wx' });
			await fs.rename(temporary, destination);
		} catch (error) {
			await fs.unlink(temporary).catch(() => undefined);
			throw error;
		}
	}

	private filePath(key: string): string {
		// Keys are validated at the storage boundary so callers cannot escape the cache directory.
		if (
			!/^(small|normal|large|art_crop)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/.test(
				key
			)
		) {
			throw new Error('Invalid image cache key');
		}
		return path.join(this.directory, key);
	}
}
