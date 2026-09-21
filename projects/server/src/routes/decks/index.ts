import { json, Router } from 'express';
import type { Request, Response } from 'express';

import { CardDatabase } from '../../database/cards/CardDatabase';
import { Database } from '../../database/app/database';
import { localDeckArtUrl } from '../../images/card-images';
import { imageBaseUrl } from '../../images/image-base-url';
import { bannerBlendResponse, deckBannerArt } from './banner-blend';
import { PathBuilder } from '../../utils/PathBuilder';
import { createRoutesDecksId } from './[id]';

export function createRoutesDecks(
	pathBuilder: PathBuilder,
	database: Database,
	cardDatabase: CardDatabase
) {
	const app = Router();

	const routePath = pathBuilder.pathAt('/');

	app.use(pathBuilder.pathAt('/:id/banner-blend'), json({ limit: '6mb' }));
	app.use(json());
	app.options(routePath, async (req: Request, res: Response) => {
		res.status(200);
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
		res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE');
		res.send();
	});
	app.post(routePath, async (req: Request, res: Response) => {
		const { name } = req.body;
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

		const rowId = await database.createDeck(name);
		const deckId = (await database.getDeck(String(rowId)))!.PublicId;

		res.status(200);
		res.send(
			JSON.stringify({
				deckId
			})
		);
	});
	app.get(routePath, async (req: Request, res: Response) => {
		const pageStartVal = Number(req.query.pageStart ?? 0);
		const pageSizeVal = Number(req.query.pageSize ?? 15);

		res.setHeader('Access-Control-Allow-Origin', '*');
		if (
			!Number.isInteger(pageStartVal) ||
			!Number.isInteger(pageSizeVal) ||
			pageStartVal < 0 ||
			pageSizeVal <= 0
		) {
			res.sendStatus(400);
			return;
		}

		const decks = await database.listDecks(pageStartVal, pageSizeVal);

		const response = await Promise.all(
			decks.map(async (deck) => {
				const bannerArt = await deckBannerArt(
					database,
					cardDatabase,
					deck
				);
				return {
					deckId: deck.PublicId,
					name: deck.Name,
					art: localDeckArtUrl(imageBaseUrl(req), bannerArt),
					bannerBlend: await bannerBlendResponse(
						database,
						deck,
						bannerArt,
						imageBaseUrl(req)
					),
					createdAt: deck.CreatedAt,
					updatedAt: deck.UpdatedAt
				};
			})
		);

		res.status(200);
		res.setHeader('Content-Type', 'application/json');
		res.send(JSON.stringify(response));
	});

	const builder = pathBuilder.routes('/:id');
	app.use(createRoutesDecksId(builder, database, cardDatabase));

	return app;
}
