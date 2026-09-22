import { randomBytes, scrypt, timingSafeEqual } from 'crypto';

// OWASP's scrypt baseline (N=2^17, r=8, p=1): about 128 MiB and 100 ms per hash.
const N = 1 << 17;
const R = 8;
const P = 1;
const KEY_LENGTH = 32;
const MAX_MEMORY = 256 * 1024 * 1024;

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 1024;

function derive(
	password: string,
	salt: Buffer,
	n: number,
	r: number,
	p: number
): Promise<Buffer> {
	return new Promise((resolve, reject) =>
		scrypt(
			password,
			salt,
			KEY_LENGTH,
			{ N: n, r, p, maxmem: MAX_MEMORY },
			(error, key) => (error ? reject(error) : resolve(key))
		)
	);
}

/** A self-describing hash: `scrypt$N$r$p$salt$key`, so parameters can rise later. */
export async function hashPassword(password: string): Promise<string> {
	const salt = randomBytes(16);
	const key = await derive(password, salt, N, R, P);
	return [
		'scrypt',
		N,
		R,
		P,
		salt.toString('base64'),
		key.toString('base64')
	].join('$');
}

export async function verifyPassword(
	password: string,
	stored: string
): Promise<boolean> {
	const [scheme, n, r, p, salt, key] = stored.split('$');
	if (scheme !== 'scrypt' || !key) return false;
	const expected = Buffer.from(key, 'base64');
	const actual = await derive(
		password,
		Buffer.from(salt, 'base64'),
		Number(n),
		Number(r),
		Number(p)
	);
	return (
		actual.length === expected.length && timingSafeEqual(actual, expected)
	);
}

/** Checked in place of a missing user's hash so response time does not reveal which usernames exist. */
export const UNUSED_PASSWORD_HASH = hashPassword(
	randomBytes(16).toString('hex')
);
