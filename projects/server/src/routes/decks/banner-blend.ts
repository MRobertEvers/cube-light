import { Router, Request, Response } from 'express';
import { createHash } from 'crypto';
import { Database, Deck } from '../../database/app/database';
import { localDeckArtUrl } from '../../images/card-images';
import { imageBaseUrl } from '../../images/image-base-url';
import { PathBuilder } from '../../utils/PathBuilder';

const sizes = { desktop: [1440, 224], mobile: [720, 224], tile: [640, 224] };
const defaultCrop = { desktop: { x: 0.5, y: 0.5, zoom: 1 }, mobile: { x: 0.5, y: 0.5, zoom: 1 } };

export async function bannerBlendResponse(database: Database, deck: Deck, base: string) {
	const blend = await database.getDeckBannerBlend(String(deck.DeckId));
	if (!blend) return null;
	const valid = blend.SourceArt === deck.Art && blend.CropJson === deck.BannerCropJson;
	return { config: JSON.parse(blend.ConfigJson), images: valid ? {
		desktop: `${base}/decks/${deck.PublicId}/banner-blend/desktop/${blend.Revision}.png`,
		mobile: `${base}/decks/${deck.PublicId}/banner-blend/mobile/${blend.Revision}.png`,
		tile: `${base}/decks/${deck.PublicId}/banner-blend/tile/${blend.Revision}.png`
	} : null };
}

export function createBannerBlendRoutes(builder: PathBuilder, database: Database): Router {
	const app = Router(), route = builder.pathAt('/banner-blend');
	app.options(route, (_req, res) => {
		res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
		res.setHeader('Access-Control-Allow-Methods', 'PUT'); res.sendStatus(204);
	});
	app.put(route, async (req: Request<{ id: string }>, res: Response) => {
		res.setHeader('Access-Control-Allow-Origin', '*');
		const { config, source, crop, images } = req.body ?? {};
		if (!config || Object.keys(config).length !== 5 || !['multiband', 'poisson', 'fade'].includes(config.method) ||
			typeof config.contentAware !== 'boolean' || !/^#[0-9a-f]{6}$/i.test(config.surface) ||
			typeof config.position !== 'number' || !Number.isFinite(config.position) || config.position < 0.35 || config.position > 0.55 ||
			typeof config.width !== 'number' || !Number.isFinite(config.width) || config.width < 0.08 || config.width > 0.24 ||
			typeof source !== 'string' || !crop || !images || Object.keys(images).length !== 3) { res.sendStatus(400); return; }
		const buffers = {} as { desktop: Buffer; mobile: Buffer; tile: Buffer };
		for (const variant of ['desktop', 'mobile', 'tile'] as const) {
			if (typeof images[variant] !== 'string' || images[variant].length > 1800000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(images[variant])) { res.sendStatus(400); return; }
			const bytes = Buffer.from(images[variant], 'base64');
			if (bytes.length < 45 || bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' ||
				bytes.readUInt32BE(8) !== 13 || bytes.subarray(12, 16).toString() !== 'IHDR' ||
				bytes.subarray(bytes.length - 12).toString('hex') !== '0000000049454e44ae426082' ||
				bytes.readUInt32BE(16) !== sizes[variant][0] || bytes.readUInt32BE(20) !== sizes[variant][1]) { res.sendStatus(400); return; }
			buffers[variant] = bytes;
		}
		const deck = await database.getDeckByPublicId(req.params.id);
		if (!deck) { res.sendStatus(404); return; }
		const expectedCrop = deck.BannerCropJson ? JSON.parse(deck.BannerCropJson) : defaultCrop;
		const sameCrop = ['desktop', 'mobile'].every((v) => crop[v] && ['x', 'y', 'zoom'].every((k) => crop[v][k] === expectedCrop[v][k]));
		if (source !== localDeckArtUrl(imageBaseUrl(req), deck.Art) || !sameCrop) { res.sendStatus(409); return; }
		const json = JSON.stringify(config);
		const revision = createHash('sha256').update(json).update(buffers.desktop).update(buffers.mobile).update(buffers.tile).digest('hex');
		const saved = await database.setDeckBannerBlend(String(deck.DeckId), deck.Art, deck.BannerCropJson, json, revision, buffers);
		res.sendStatus(saved ? 204 : 409);
	});
	app.get(builder.pathAt('/banner-blend/:variant/:revision.png'), async (req: Request<{ id: string; variant: string; revision: string }>, res: Response) => {
		res.setHeader('Access-Control-Allow-Origin', '*');
		const { variant, revision } = req.params;
		if (!['desktop', 'mobile', 'tile'].includes(variant) || !/^[0-9a-f]{64}$/.test(revision)) { res.sendStatus(404); return; }
		const deck = await database.getDeckByPublicId(req.params.id);
		const image = deck && await database.getDeckBannerBlendImage(String(deck.DeckId), variant as keyof typeof sizes, revision);
		if (!image) { res.sendStatus(404); return; }
		res.setHeader('Content-Type', 'image/png'); res.setHeader('X-Content-Type-Options', 'nosniff');
		res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); res.setHeader('ETag', `"${revision}"`);
		if (req.get('If-None-Match') === `"${revision}"`) { res.sendStatus(304); return; }
		res.send(Buffer.from(image));
	});
	return app;
}
