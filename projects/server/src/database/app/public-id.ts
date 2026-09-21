import { randomBytes } from 'crypto';

export type PublicIdKind = 'deck' | 'collection' | 'location' | 'work';

// Twelve cryptographically random bytes encode to 16 URL-safe characters (96 bits).
export function createPublicId(kind: PublicIdKind): string {
	return `${kind}_${randomBytes(12).toString('base64').replace(/\+/g, '-').replace(/\//g, '_')}`;
}

export function isPublicId(value: string, kind: PublicIdKind): boolean {
	return new RegExp(`^${kind}_[A-Za-z0-9_-]{16}$`).test(value);
}
