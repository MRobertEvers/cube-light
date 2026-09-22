import type { OcrResultItem } from '@paddleocr/paddleocr-js';
import {
	bestCardName,
	prepareCardNames,
	PreparedCardNames
} from './card-name-match';
import type { CardImageCandidate, ImageRegion } from './card-image-ocr';

type InitializeMessage = { type: 'initialize'; names: string[] };
type MatchMessage = {
	type: 'match';
	id: number;
	items: OcrResultItem[];
	region: ImageRegion;
};
type InputMessage = InitializeMessage | MatchMessage;

let names: PreparedCardNames | null = null;
const candidates: CardImageCandidate[] = [];

function itemBox(item: OcrResultItem, region: ImageRegion): ImageRegion {
	const xs = item.poly.map((point) => point[0] + region.x);
	const ys = item.poly.map((point) => point[1] + region.y);
	const x = Math.min(...xs);
	const y = Math.min(...ys);
	return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

function sameLocation(left: ImageRegion, right: ImageRegion): boolean {
	const leftX = left.x + left.width / 2;
	const leftY = left.y + left.height / 2;
	const rightX = right.x + right.width / 2;
	const rightY = right.y + right.height / 2;
	return (
		Math.abs(leftX - rightX) < Math.max(left.width, right.width) / 2 &&
		Math.abs(leftY - rightY) <
			Math.max(8, Math.max(left.height, right.height) * 1.2)
	);
}

function appendCandidates(items: OcrResultItem[], region: ImageRegion): void {
	if (!names) throw new Error('Card names are not loaded');
	for (const item of items) {
		if (item.score < 0.45 || item.text.length > 80) continue;
		const suggestion = bestCardName(item.text, names);
		if (!suggestion || suggestion.score < 80) continue;
		const box = itemBox(item, region);
		const duplicate = candidates.find(
			(candidate) =>
				candidate.name === suggestion.name &&
				sameLocation(candidate.box, box)
		);
		if (duplicate) {
			if (suggestion.score > duplicate.score) {
				duplicate.score = suggestion.score;
				duplicate.text = item.text;
				duplicate.box = box;
			}
		} else {
			candidates.push({
				name: suggestion.name,
				text: item.text,
				score: suggestion.score,
				box
			});
		}
	}
}

self.onmessage = function (event: MessageEvent<InputMessage>) {
	const message = event.data;
	try {
		if (message.type === 'initialize') {
			names = prepareCardNames(message.names);
			self.postMessage({ type: 'ready' });
		} else {
			appendCandidates(message.items, message.region);
			self.postMessage({
				type: 'matched',
				id: message.id,
				candidates: [...candidates]
			});
		}
	} catch (error) {
		self.postMessage({
			type: 'error',
			id: message.type === 'match' ? message.id : undefined,
			message:
				error instanceof Error
					? error.message
					: 'Could not match card names'
		});
	}
};
