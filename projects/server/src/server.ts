import express from 'express';
import path from 'path';
import { CardDatabase } from './database/cards/database';
import { Database } from './database/app/database';

import { deckAPI } from './application/decks/[id]';
import { cardsAPI } from './application/decks/[id]/cards';
import { suggestAPI } from './application/suggest';
import { decksAPI } from './application/decks';

const PORT = 4040;

const cDb = new CardDatabase(path.join(__dirname, '../assets/AllPrintings.sqlite'));
const db = new Database('database.sqlite');

const app = express();

app.use(deckAPI(db, cDb));
app.use(decksAPI(db, cDb));
app.use(cardsAPI(db, cDb));
app.use(suggestAPI(cDb));

app.listen(PORT, () => {
	console.log(`Listening on port ${PORT}`);
});
