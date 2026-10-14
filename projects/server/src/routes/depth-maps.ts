import { createHash } from 'crypto';
import { Request, Response, Router } from 'express';
import { isScryfallId } from '../images/card-images';
import type { DepthMapService } from '../images/depth/depth-maps';

/**
 * Height maps of art crops ("parallax art"), for clients that draw them:
 *
 * - `GET /images/depth`: whether this server makes them ({ available, stamp, reason }).
 * - `GET /images/depth/<id>.png`: the map of `/images/art_crop/<id>.jpg`. 200 with the PNG (one
 *   byte per pixel: 105 far .. 223 near); 503 with Retry-After while it is being made (not a 2xx,
 *   so no cache keeps the wait); 404 when there is none to be had (no art, no model, or making
 *   it failed). A map can be made again (a new model), so it is cached for a day, by its ETag.
 */
export function createRoutesDepthMaps(depthMaps: DepthMapService): Router {
	const app = Router();

	app.get('/images/depth', (_req: Request, res: Response) => {
		res.setHeader('Cache-Control', 'no-store');
		res.json(depthMaps.status());
	});

	app.get(
		'/images/depth/:id.png',
		async (req: Request<{ id: string }>, res: Response) => {
			res.setHeader('Cache-Control', 'no-store');
			const { id } = req.params;
			if (!isScryfallId(id)) {
				res.sendStatus(400);
				return;
			}
			try {
				const answer = await depthMaps.get(id.toLowerCase());
				if (answer.state === 'pending') {
					res.setHeader('Retry-After', String(answer.retryAfterSeconds));
					res.sendStatus(503);
					return;
				}
				if (answer.state === 'missing') {
					res.sendStatus(404);
					return;
				}
				const { png } = answer;
				const etag = `"${createHash('sha256').update(png).digest('hex')}"`;
				res.setHeader('Cache-Control', 'public, max-age=86400');
				res.setHeader('Content-Type', 'image/png');
				res.setHeader('ETag', etag);
				res.setHeader('X-Content-Type-Options', 'nosniff');
				const ifNoneMatch = req.get('If-None-Match');
				if (ifNoneMatch && ifNoneMatch.split(',').some((value) => value.trim().replace(/^W\//, '') === etag)) {
					res.status(304).end();
					return;
				}
				res.setHeader('Content-Length', png.length);
				res.status(200).end(req.method === 'HEAD' ? undefined : png);
			} catch (error) {
				console.error('Unable to serve a height map', error);
				res.sendStatus(502);
			}
		}
	);

	return app;
}
