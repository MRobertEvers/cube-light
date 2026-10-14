// One server process for images.test.js: opens the shared art cache given on the command line,
// says 'ready', and on 'go' asks for one card image through a slow stand-in for Scryfall. It
// reports how many downloads it made and whether it got the image.
const { readFileSync } = require('node:fs');
const { ArtCacheImageCache } = require('../../build/src/images/ArtCacheImageCache');
const { CardImageService } = require('../../build/src/images/card-images');
const { NativeImageMeasurer } = require('../../build/src/images/image-measurer');

const [root, index, id, imagePath] = process.argv.slice(2);
const image = readFileSync(imagePath);
let downloads = 0;

function sleep(milliseconds) {
	return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function scryfall() {
	downloads++;
	// Long enough for every other process to find the image claimed.
	await sleep(1500);
	return new Response(image, { headers: { 'Content-Type': 'image/jpeg' } });
}

const cache = new ArtCacheImageCache(root, { index });
const images = new CardImageService(cache, new NativeImageMeasurer(), scryfall);

process.on('message', async (message) => {
	if (message !== 'go') return;
	try {
		const got = await images.get(id, 'art_crop');
		process.send({ downloads, same: Boolean(got && got.equals(image)) });
	} catch (error) {
		process.send({ downloads, error: String(error) });
	} finally {
		cache.close();
		process.disconnect();
	}
});
process.send('ready');
