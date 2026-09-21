import { createHash } from 'crypto';
import { Request, Response, Router } from 'express';
import {
	CardImageService,
	isImageVariant,
	isScryfallId
} from '../images/card-images';

export function createRoutesImages(images: CardImageService): Router {
	const app = Router();

	app.get(
		'/images/:variant/:id.jpg',
		async (
			req: Request<{ variant: string; id: string }>,
			res: Response
		) => {
			res.setHeader('Cache-Control', 'no-store');
			res.setHeader('Access-Control-Allow-Origin', '*');
			const { id, variant } = req.params;
			if (!isImageVariant(variant) || !isScryfallId(id)) {
				res.sendStatus(400);
				return;
			}

			try {
				const image = await images.get(id, variant);
				if (!image) {
					res.sendStatus(404);
					return;
				}

				res.setHeader('Cache-Control', 'public, max-age=31536000');
				res.setHeader('Content-Type', 'image/jpeg');
				res.setHeader('Content-Length', image.length);
				const etag = `"${createHash('sha256').update(image).digest('hex')}"`;
				res.setHeader('ETag', etag);
				res.setHeader('X-Content-Type-Options', 'nosniff');
				const ifNoneMatch = req.get('If-None-Match');
				if (
					ifNoneMatch &&
					ifNoneMatch.split(',').some((value) => {
						const candidate = value.trim();
						return (
							candidate === '*' ||
							candidate.replace(/^W\//, '') === etag
						);
					})
				) {
					res.status(304).end();
					return;
				}
				res.status(200).end(req.method === 'HEAD' ? undefined : image);
			} catch (error) {
				console.error('Unable to serve card image', error);
				res.sendStatus(502);
			}
		}
	);

	return app;
}
