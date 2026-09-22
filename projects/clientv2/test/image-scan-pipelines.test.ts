import test from 'node:test';
import assert from 'node:assert/strict';
import {
	DEFAULT_IMAGE_PIPELINE,
	IMAGE_PIPELINES,
	isCardImagePipeline
} from '../src/utils/image-scan-pipelines';
test('compact card-aware scanning is the default', () =>
	assert.equal(DEFAULT_IMAGE_PIPELINE, 'card-aware'));
test('only supported executable pipelines can be selected', () => {
	assert.deepEqual(
		IMAGE_PIPELINES.map((p) => p.value),
		['card-aware', 'paddle-only']
	);
	assert.equal(isCardImagePipeline('card-aware'), true);
	assert.equal(isCardImagePipeline('paddle-only'), true);
	for (const x of ['glm', 'unknown', null, {}])
		assert.equal(isCardImagePipeline(x), false);
});
