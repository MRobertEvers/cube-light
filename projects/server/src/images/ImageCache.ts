export interface ImageCache {
	get(key: string): Promise<Buffer | null>;
	set(key: string, image: Buffer): Promise<void>;
}
