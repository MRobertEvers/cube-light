import { Router, Request, Response } from 'express';
import { createHash } from 'crypto';
import { Database, Deck } from '../../database/app/database';
import { CardDatabase } from '../../database/cards/CardDatabase';
import { cardImagePath, localDeckArtUrl } from '../../images/card-images';
import { imageBaseUrl } from '../../images/image-base-url';
import { PathBuilder } from '../../utils/PathBuilder';

const sizes = { desktop: [1440, 224], mobile: [720, 224], tile: [640, 224] };
const defaultCrop = {
	desktop: { x: 0.5, y: 0.5, zoom: 1 },
	mobile: { x: 0.5, y: 0.5, zoom: 1 }
};
const LEGACY_KEYS = ['contentAware', 'method', 'position', 'surface', 'width'];
const CURRENT_KEYS = [
	...LEGACY_KEYS,
	'decontamination',
	'feather',
	'protectSubject',
	'protection',
	'version'
].sort();
const MAX_STROKES = 64,
	MAX_STROKE_POINTS = 512,
	MAX_CONFIG_JSON = 96 * 1024;

function unit(n: unknown): n is number {
	return typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1;
}
function validProtection(protection: any): boolean {
	const { rect } = protection ?? {};
	if (protection === null) return true;
	if (
		!protection ||
		typeof protection !== 'object' ||
		Object.keys(protection).sort().join() !== 'rect,source,strokes' ||
		typeof protection.source !== 'string' ||
		protection.source.length > 1024 ||
		!Array.isArray(protection.strokes) ||
		protection.strokes.length > MAX_STROKES
	)
		return false;
	if (
		rect !== null &&
		(!rect ||
			Object.keys(rect).sort().join() !== 'height,width,x,y' ||
			![rect.x, rect.y, rect.width, rect.height].every(unit) ||
			rect.x + rect.width > 1.0001 ||
			rect.y + rect.height > 1.0001)
	)
		return false;
	return protection.strokes.every(
		(stroke: any) =>
			stroke &&
			Object.keys(stroke).sort().join() === 'label,points,radius' &&
			(stroke.label === 'foreground' || stroke.label === 'background') &&
			unit(stroke.radius) &&
			stroke.radius > 0 &&
			stroke.radius <= 0.25 &&
			Array.isArray(stroke.points) &&
			stroke.points.length >= 2 &&
			stroke.points.length % 2 === 0 &&
			stroke.points.length <= MAX_STROKE_POINTS * 2 &&
			stroke.points.every(unit)
	);
}

/** Accepts current (v2+) configs and the original five-field format from older clients. */
export function validBannerBlendConfig(config: any): boolean {
	if (!config || typeof config !== 'object') return false;
	const keys = Object.keys(config).sort().join();
	const common =
		['multiband', 'poisson', 'fade'].includes(config.method) &&
		typeof config.contentAware === 'boolean' &&
		/^#[0-9a-f]{6}$/i.test(config.surface) &&
		typeof config.position === 'number' &&
		Number.isFinite(config.position) &&
		config.position >= 0.35 &&
		config.position <= 0.55 &&
		typeof config.width === 'number' &&
		Number.isFinite(config.width) &&
		config.width >= 0.08 &&
		config.width <= 0.24;
	if (keys === LEGACY_KEYS.join()) return common;
	return (
		keys === CURRENT_KEYS.join() &&
		common &&
		Number.isInteger(config.version) &&
		config.version >= 2 &&
		config.version <= 1000 &&
		typeof config.protectSubject === 'boolean' &&
		Number.isInteger(config.feather) &&
		config.feather >= 1 &&
		config.feather <= 12 &&
		unit(config.decontamination) &&
		validProtection(config.protection) &&
		JSON.stringify(config).length <= MAX_CONFIG_JSON
	);
}

/** History shows config diffs as text, so brush point lists are summarized. */
export function bannerBlendHistoryValue(config: any): string {
	if (!config?.protection) return JSON.stringify(config);
	const { strokes, ...protection } = config.protection;
	return JSON.stringify({
		...config,
		protection: { ...protection, strokes: strokes.length }
	});
}

/**
 * The artwork a deck's banner shows, in stored form: the chosen art, or the first card's art
 * when none was chosen. Blends are keyed by this, so decks on the fallback art can save one too.
 */
export async function deckBannerArt(
	database: Database,
	cardDatabase: CardDatabase,
	deck: Deck
): Promise<string | null> {
	if (deck.Art) return deck.Art;
	const [firstCard] = await database.getDeckCards(String(deck.DeckId));
	if (!firstCard) return null;
	const [card] = await cardDatabase.queryCardInfo([firstCard.Uuid]);
	return cardImagePath(card?.scryfallId, 'art_crop');
}

export async function bannerBlendResponse(
	database: Database,
	deck: Deck,
	art: string | null,
	base: string
) {
	const blend = await database.getDeckBannerBlend(String(deck.DeckId));
	if (!blend) return null;
	const valid =
		!!art &&
		blend.SourceArt === art &&
		blend.CropJson === deck.BannerCropJson;
	return {
		config: JSON.parse(blend.ConfigJson),
		images: valid
			? {
					desktop: `${base}/decks/${deck.PublicId}/banner-blend/desktop/${blend.Revision}.png`,
					mobile: `${base}/decks/${deck.PublicId}/banner-blend/mobile/${blend.Revision}.png`,
					tile: `${base}/decks/${deck.PublicId}/banner-blend/tile/${blend.Revision}.png`
				}
			: null
	};
}

export function createBannerBlendRoutes(
	builder: PathBuilder,
	database: Database,
	cardDatabase: CardDatabase
): Router {
	const app = Router(),
		route = builder.pathAt('/banner-blend');
	app.options(route, (_req, res) => {
		res.sendStatus(204);
	});
	app.put(route, async (req: Request<{ id: string }>, res: Response) => {
		const { config, source, crop, images } = req.body ?? {};
		if (
			!validBannerBlendConfig(config) ||
			typeof source !== 'string' ||
			!crop ||
			!images ||
			Object.keys(images).length !== 3
		) {
			res.sendStatus(400);
			return;
		}
		const buffers = {} as {
			desktop: Buffer;
			mobile: Buffer;
			tile: Buffer;
		};
		for (const variant of ['desktop', 'mobile', 'tile'] as const) {
			if (
				typeof images[variant] !== 'string' ||
				images[variant].length > 1800000 ||
				!/^[A-Za-z0-9+/]+={0,2}$/.test(images[variant])
			) {
				res.sendStatus(400);
				return;
			}
			const bytes = Buffer.from(images[variant], 'base64');
			if (
				bytes.length < 45 ||
				bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' ||
				bytes.readUInt32BE(8) !== 13 ||
				bytes.subarray(12, 16).toString() !== 'IHDR' ||
				bytes.subarray(bytes.length - 12).toString('hex') !==
					'0000000049454e44ae426082' ||
				bytes.readUInt32BE(16) !== sizes[variant][0] ||
				bytes.readUInt32BE(20) !== sizes[variant][1]
			) {
				res.sendStatus(400);
				return;
			}
			buffers[variant] = bytes;
		}
		const deck = await database.getDeckByPublicId(req.params.id);
		if (!deck) {
			res.sendStatus(404);
			return;
		}
		const expectedCrop = deck.BannerCropJson
			? JSON.parse(deck.BannerCropJson)
			: defaultCrop;
		const sameCrop = ['desktop', 'mobile'].every(
			(v) =>
				crop[v] &&
				['x', 'y', 'zoom'].every(
					(k) => crop[v][k] === expectedCrop[v][k]
				)
		);
		const art = await deckBannerArt(database, cardDatabase, deck);
		if (
			!art ||
			source !== localDeckArtUrl(imageBaseUrl(req), art) ||
			!sameCrop
		) {
			res.sendStatus(409);
			return;
		}
		const json = JSON.stringify(config);
		// Cache identity: algorithm version, source art, crop, full config (including the
		// protection selection), and the image bytes. Any change yields a new immutable URL.
		const revision = createHash('sha256')
			.update(
				`banner-blend:v${config.version ?? 1}\0${art}\0${deck.BannerCropJson ?? ''}\0`
			)
			.update(json)
			.update(buffers.desktop)
			.update(buffers.mobile)
			.update(buffers.tile)
			.digest('hex');
		const saved = await database.setDeckBannerBlend(
			String(deck.DeckId),
			deck.Art,
			art,
			deck.BannerCropJson,
			json,
			revision,
			buffers,
			bannerBlendHistoryValue(config)
		);
		res.sendStatus(saved ? 204 : 409);
	});
	app.get(
		builder.pathAt('/banner-blend/:variant/:revision.png'),
		async (
			req: Request<{ id: string; variant: string; revision: string }>,
			res: Response
		) => {
			const { variant, revision } = req.params;
			if (
				!['desktop', 'mobile', 'tile'].includes(variant) ||
				!/^[0-9a-f]{64}$/.test(revision)
			) {
				res.sendStatus(404);
				return;
			}
			const deck = await database.getDeckByPublicId(req.params.id);
			const image =
				deck &&
				(await database.getDeckBannerBlendImage(
					String(deck.DeckId),
					variant as keyof typeof sizes,
					revision
				));
			if (!image) {
				res.sendStatus(404);
				return;
			}
			res.setHeader('Content-Type', 'image/png');
			res.setHeader('X-Content-Type-Options', 'nosniff');
			res.setHeader(
				'Cache-Control',
				'public, max-age=31536000, immutable'
			);
			res.setHeader('ETag', `"${revision}"`);
			if (req.get('If-None-Match') === `"${revision}"`) {
				res.sendStatus(304);
				return;
			}
			res.send(Buffer.from(image));
		}
	);
	return app;
}
