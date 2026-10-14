import { deflateSync } from 'zlib';

/**
 * An 8-bit greyscale PNG with one tEXt chunk before its image data: how a height map names what
 * made it in the art cache (3rd/artcache/FORMAT.md, keyword "torimtg-version").
 */

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
export const VERSION_KEYWORD = 'torimtg-version';

const CRC_TABLE = (function makeTable() {
	const table = new Int32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		table[n] = c;
	}
	return table;
})();

function crc32(bytes: Buffer): number {
	let c = -1;
	for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
	return (c ^ -1) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
	const head = Buffer.alloc(8);
	head.writeUInt32BE(data.length, 0);
	head.write(type, 4, 'latin1');
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
	return Buffer.concat([head, data, crc]);
}

/** The PNG of one byte per pixel, rows top first, with `version` in its tEXt chunk. */
export function encodeGreyPng(
	width: number,
	height: number,
	pixels: Uint8Array,
	version: string
): Buffer {
	const header = Buffer.alloc(13);
	header.writeUInt32BE(width, 0);
	header.writeUInt32BE(height, 4);
	header[8] = 8; // bit depth
	header[9] = 0; // greyscale
	// compression, filter and interlace methods: 0
	const raw = Buffer.alloc((width + 1) * height);
	for (let y = 0; y < height; y++) {
		raw[y * (width + 1)] = 0; // filter: none
		raw.set(pixels.subarray(y * width, (y + 1) * width), y * (width + 1) + 1);
	}
	return Buffer.concat([
		SIGNATURE,
		chunk('IHDR', header),
		chunk('tEXt', Buffer.concat([Buffer.from(VERSION_KEYWORD, 'latin1'), Buffer.from([0]), Buffer.from(version, 'latin1')])),
		chunk('IDAT', deflateSync(raw, { level: 9 })),
		chunk('IEND', Buffer.alloc(0))
	]);
}
