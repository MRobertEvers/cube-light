import test from 'node:test';
import assert from 'node:assert/strict';
import { IMAGE_PALETTE_SAMPLE_SIZE, base64ToBytes, imageKey, imageRefOf, paletteFromPixels, previewFromPixels, previewSampleSize, thumbHashToApproximateAspectRatio, thumbHashToDataURL } from '../dist/index.js';

const id = '67f4c93b-080c-4196-b095-6a120a221988';

test('an image is identified the same way whoever serves it', () => {
    const expected = { variant: 'art_crop', id };
    assert.deepEqual(imageRefOf(`/api/images/art_crop/${id}.jpg`), expected);
    assert.deepEqual(imageRefOf(`https://cdn.example.com/images/art_crop/${id.toUpperCase()}.jpg`), expected);
    assert.deepEqual(imageRefOf(`https://cards.scryfall.io/art_crop/front/6/7/${id}.jpg?1700000000`), expected);
    assert.equal(imageKey(expected), `art_crop/${id}`);
});

test('urls that are not stored card images have no ref', () => {
    assert.equal(imageRefOf(null), null);
    assert.equal(imageRefOf(''), null);
    assert.equal(imageRefOf('data:image/gif;base64,R0lGOD'), null);
    assert.equal(imageRefOf(`/images/huge/${id}.jpg`), null);
    assert.equal(imageRefOf('/images/art_crop/not-an-id.jpg'), null);
});

function square(red, green, blue) {
    const pixels = new Uint8Array(IMAGE_PALETTE_SAMPLE_SIZE * IMAGE_PALETTE_SAMPLE_SIZE * 4);
    for (let index = 0; index < pixels.length; index += 4) {
        pixels[index] = red;
        pixels[index + 1] = green;
        pixels[index + 2] = blue;
        pixels[index + 3] = 255;
    }
    return pixels;
}

test('a colorful image gives a palette with a readable accent', () => {
    const palette = paletteFromPixels(square(200, 40, 40));
    assert.ok(palette);
    for (const color of [palette.accent, palette.surface, palette.wash, palette.border]) assert.match(color, /^#[0-9a-f]{6}$/);
    // The accent keeps the image's hue: red dominates.
    const [red, green, blue] = [1, 3, 5].map((start) => parseInt(palette.accent.slice(start, start + 2), 16));
    assert.ok(red > green && red > blue);
});

test('a gray image has no palette', () => {
    assert.equal(paletteFromPixels(square(128, 128, 128)), null);
});

test('previews are sampled in the image\'s own proportions, at most 100px', () => {
    assert.deepEqual(previewSampleSize(626, 457), { width: 100, height: 73 });
    assert.deepEqual(previewSampleSize(488, 680), { width: 72, height: 100 });
    assert.deepEqual(previewSampleSize(40, 20), { width: 40, height: 20 });
    assert.deepEqual(previewSampleSize(5000, 10), { width: 100, height: 1 });
});

test('a preview is a few bytes that decode to a small image of the same shape', () => {
    const { width, height } = previewSampleSize(626, 457);
    const pixels = new Uint8Array(width * height * 4);
    for (let index = 0; index < pixels.length; index += 4) {
        const x = (index / 4) % width;
        pixels[index] = x < width / 2 ? 220 : 30;
        pixels[index + 1] = 60;
        pixels[index + 2] = x < width / 2 ? 30 : 200;
        pixels[index + 3] = 255;
    }
    const preview = previewFromPixels(width, height, pixels);
    const bytes = base64ToBytes(preview);
    assert.ok(bytes.length < 40);
    assert.ok(Math.abs(thumbHashToApproximateAspectRatio(bytes) - 626 / 457) < 0.3);
    assert.match(thumbHashToDataURL(bytes), /^data:image\/png;base64,/);
});
