import type { CardScanner, CardScanUpdate } from '../../engine/ports';
import type { CardImagePipeline } from '../../domain/scans/image-scan-pipelines';
import { scanCardImage } from './card-image-ocr';

/** Reads card names off a photo with the OCR and title-index workers. */
export class BrowserCardScanner implements CardScanner {
	scan(
		photo: File,
		names: string[],
		onUpdate: (update: CardScanUpdate) => void,
		isCancelled: () => boolean,
		options: { pipeline: CardImagePipeline }
	) {
		return scanCardImage(photo, names, onUpdate, isCancelled, options);
	}
}
