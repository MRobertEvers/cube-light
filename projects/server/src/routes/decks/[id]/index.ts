import { Router } from 'express';
import { Request, Response } from 'express';
import { createNameLookupTree } from '../../../app/create-name-lookup-tree';
import {
	DeckOverviewCardInfo,
	getDeckOverviewCardInfo
} from '../../../app/get-deck-overview-card-info';
import { Database } from '../../../database/app/database';
import { CardDatabase } from '../../../database/cards/CardDatabase';
import { imageBaseUrl } from '../../../images/image-base-url';
import { cardImagePath, localDeckArtUrl } from '../../../images/card-images';
import { PathBuilder } from '../../../utils/PathBuilder';
import { createRoutesDecksIdCards } from './cards';
import { bannerBlendResponse, createBannerBlendRoutes } from '../banner-blend';

const PALETTE_KEYS = ['accent', 'surface', 'wash', 'border'] as const;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const MAX_MASKED_BANNER_X = 1.12; // Keep in sync with the client crop control.

function storedPalette(value: string | null): Record<string, string> | null {
	if (!value) return null;
	try {
		return JSON.parse(value);
	} catch {
		return null;
	}
}

function storedBannerCrop(value: string | null): unknown {
	if (!value) return null;
	try {
		const crop = JSON.parse(value) as unknown;
		return validBannerCrop(crop) ? crop : null;
	} catch { return null; }
}

function validBannerCrop(value: unknown): boolean {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
	const crop = value as Record<string, unknown>;
	if (Object.keys(crop).length !== 2) return false;
	return ['desktop', 'mobile'].every((variant) => {
		const frame = crop[variant];
		if (!frame || typeof frame !== 'object' || Array.isArray(frame)) return false;
		const values = frame as Record<string, unknown>;
		return Object.keys(values).length === 3 &&
			typeof values.x === 'number' && Number.isFinite(values.x) && values.x >= 0 && values.x <= MAX_MASKED_BANNER_X &&
			typeof values.y === 'number' && Number.isFinite(values.y) && values.y >= 0 && values.y <= 1 &&
			typeof values.zoom === 'number' && Number.isFinite(values.zoom) && values.zoom >= 1 && values.zoom <= 3;
	});
}

export function createRoutesDecksId(
	pathBuilder: PathBuilder,
	database: Database,
	cardDatabase: CardDatabase
): Router {
	const app = Router();
	app.use(createBannerBlendRoutes(pathBuilder, database));

	const routePath = pathBuilder.pathAt('/');

	app.options(routePath, async (req: Request, res: Response) => {
		res.status(200);
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
		res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE');
		res.send();
	});
	app.get(routePath, async (req: Request<{ id: string }>, res: Response) => {
		const { id } = req.params;
		const deck = await database.getDeckByPublicId(id);

		if (!deck) {
			res.sendStatus(404);
			return;
		}

		const deckCards = await database.getDeckCards(String(deck.DeckId));
		const deckCardsUuids = deckCards.map((dc) => dc.Uuid);

		const cards = await getDeckOverviewCardInfo(deckCardsUuids, cardDatabase, imageBaseUrl(req));

		const cardInfosMapped = cards.reduce((map, card) => {
			map[card.uuid] = card;
			return map;
		}, {} as Record<string, DeckOverviewCardInfo>);

		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
		res.setHeader('Content-Type', 'application/json');

		const cardData = deckCards.map((deckCard) => {
			const cardData = cardInfosMapped[deckCard.Uuid];
			return {
				...cardData,
				count: deckCard.Count
			};
		});

		const icon = localDeckArtUrl(imageBaseUrl(req), deck.Art) ?? cardData[0]?.art ?? null;
		let bannerCard: DeckOverviewCardInfo | undefined = cardData.find((card) => card.uuid === deck.BannerCardUuid);
		if (!bannerCard && deck.BannerCardUuid) {
			const [storedCard] = await cardDatabase.queryCardInfo([deck.BannerCardUuid]);
			if (storedCard) {
				[bannerCard] = await getDeckOverviewCardInfo([deck.BannerCardUuid], cardDatabase, imageBaseUrl(req));
			}
		}
		res.send(
			JSON.stringify({
				name: deck.Name,
				icon,
				bannerCardUuid: deck.BannerCardUuid ?? cardData.find((card) => card.art === icon)?.uuid ?? null,
				bannerCard: bannerCard ? { name: bannerCard.name, uuid: bannerCard.uuid, setCode: bannerCard.setCode, art: bannerCard.art ?? null } : null,
				palette: storedPalette(deck.PaletteJson),
				bannerCrop: storedBannerCrop(deck.BannerCropJson),
				bannerBlend: await bannerBlendResponse(database, deck, imageBaseUrl(req)),
				topStyle: deck.TopStyle === 'full-art' ? 'full-art' : 'card',
				cards: cardData,
				lastEdit: new Date(deck.UpdatedAt).toISOString()
			})
		);
	});
	app.get(pathBuilder.pathAt('/history'), async (req: Request<{ id: string }>, res: Response) => {
		const { id } = req.params;
		const deck = await database.getDeckByPublicId(id);
		if (!deck) {
			res.sendStatus(404);
			return;
		}
		const edits = await database.getDeckEditHistory(String(deck.DeckId));
		const uuids = [...new Set(edits.reduce((all, edit) => {
			all.push(...[...edit.cardsIn, ...edit.cardsOut].map((card) => card.uuid));
			return all;
		}, [] as string[]))];
		const names = new Map<string, string>();
		for (let start = 0; start < uuids.length; start += 500) {
			for (const card of await cardDatabase.queryCardInfo(uuids.slice(start, start + 500))) {
				names.set(card.uuid, card.name);
			}
		}
		res.json({
			deckId: deck.PublicId,
			deckName: deck.Name,
			edits: edits.map((edit) => ({
				...edit,
				cardsIn: edit.cardsIn.map((card) => ({ ...card, name: names.get(card.uuid) || null })),
				cardsOut: edit.cardsOut.map((card) => ({ ...card, name: names.get(card.uuid) || null }))
			}))
		});
	});
	app.put(routePath, async (req: Request<{ id: string }>, res: Response) => {
		res.setHeader('Access-Control-Allow-Origin', '*');
		const { id } = req.params;
		const { name, bannerCardUuid } = (req.body ?? {}) as { name?: unknown; bannerCardUuid?: unknown };
		if (typeof name !== 'string' || !name.trim() || name.trim().length > 1024 ||
			(bannerCardUuid !== undefined && typeof bannerCardUuid !== 'string')) {
			res.sendStatus(400);
			return;
		}
		const deck = await database.getDeckByPublicId(id);
		if (!deck) {
			res.sendStatus(404);
			return;
		}
		let art: string | undefined;
		if (bannerCardUuid !== undefined) {
			const [card] = await cardDatabase.queryCardInfo([bannerCardUuid as string]);
			if (!card) {
				res.sendStatus(400);
				return;
			}
			const deckUuids = new Set((await database.getDeckCards(String(deck.DeckId))).map((entry) => entry.Uuid));
			const printings = await cardDatabase.queryCardsByName(card.name);
			if (!printings.some((printing) => deckUuids.has(printing.uuid))) {
				res.sendStatus(400);
				return;
			}
			art = cardImagePath(card?.scryfallId, 'art_crop') ?? undefined;
			if (!art) {
				res.sendStatus(400);
				return;
			}
		}
		await database.updateDeckDetails(String(deck.DeckId), name.trim(), art, bannerCardUuid as string | undefined);
		res.sendStatus(204);
	});
	const palettePath = pathBuilder.pathAt('/palette');
	app.options(palettePath, (req: Request, res: Response) => {
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
		res.setHeader('Access-Control-Allow-Methods', 'PUT');
		res.sendStatus(204);
	});
	app.put(palettePath, async (req: Request<{ id: string }>, res: Response) => {
		res.setHeader('Access-Control-Allow-Origin', '*');
		const palette = req.body?.palette;
		if (palette !== null && (
			!palette || typeof palette !== 'object' || Array.isArray(palette) ||
			Object.keys(palette).length !== PALETTE_KEYS.length ||
			!PALETTE_KEYS.every((key) => typeof palette[key] === 'string' && HEX_COLOR.test(palette[key]))
		)) {
			res.sendStatus(400);
			return;
		}
		const deck = await database.getDeckByPublicId(req.params.id);
		if (!deck) {
			res.sendStatus(404);
			return;
		}
		await database.setDeckPalette(String(deck.DeckId), palette === null ? null : JSON.stringify(palette));
		res.sendStatus(204);
	});
	const cropPath = pathBuilder.pathAt('/banner-crop');
	app.options(cropPath, (_req: Request, res: Response) => {
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
		res.setHeader('Access-Control-Allow-Methods', 'PUT');
		res.sendStatus(204);
	});
	app.put(cropPath, async (req: Request<{ id: string }>, res: Response) => {
		res.setHeader('Access-Control-Allow-Origin', '*');
		const crop = req.body?.bannerCrop;
		if (!validBannerCrop(crop)) { res.sendStatus(400); return; }
		const deck = await database.getDeckByPublicId(req.params.id);
		if (!deck) { res.sendStatus(404); return; }
		await database.setDeckBannerCrop(String(deck.DeckId), JSON.stringify(crop));
		res.sendStatus(204);
	});
	const topStylePath = pathBuilder.pathAt('/top-style');
	app.options(topStylePath, (_req: Request, res: Response) => {
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
		res.setHeader('Access-Control-Allow-Methods', 'PUT');
		res.sendStatus(204);
	});
	app.put(topStylePath, async (req: Request<{ id: string }>, res: Response) => {
		res.setHeader('Access-Control-Allow-Origin', '*');
		const topStyle = req.body?.topStyle;
		if (topStyle !== 'card' && topStyle !== 'full-art') { res.sendStatus(400); return; }
		const deck = await database.getDeckByPublicId(req.params.id);
		if (!deck) { res.sendStatus(404); return; }
		await database.setDeckTopStyle(String(deck.DeckId), topStyle);
		res.sendStatus(204);
	});
	app.delete(routePath, async (req: Request<{ id: string }>, res: Response) => {
		const { id } = req.params;
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
		res.setHeader('Content-Type', 'application/json');

		const deck = await database.getDeckByPublicId(id);
		if (!deck) { res.sendStatus(404); return; }
		await database.deleteDeck(String(deck.DeckId));

		res.status(200);
		res.send(
			JSON.stringify({
				success: true
			})
		);
	});

	app.get(pathBuilder.pathAt('/card-names'), async (req: Request<{ id: string }>, res: Response) => {
		const { id } = req.params;
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
		res.setHeader('Content-Type', 'application/json');

		const deck = await database.getDeckByPublicId(id);

		if (!deck) {
			res.sendStatus(404);
			return;
		}

		const deckCards = await database.getDeckCards(String(deck.DeckId));

		const cards = await cardDatabase.queryCardInfo(deckCards.map((card) => card.Uuid));

		const lookupTree = createNameLookupTree(cards.map((card) => card.name));

		res.status(200);
		res.send(JSON.stringify(lookupTree));
	});

	const builder = pathBuilder.routes('/cards');
	app.use(createRoutesDecksIdCards(builder, database, cardDatabase));

	return app;
}
