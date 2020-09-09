import express from 'express';
import path from 'path';

import { useDeckApi } from './application/deck/deck-api';
import { CardDatabase } from './database/cards/database';
import { Database } from './database/app/database';

const PORT = 4040;

const cDb = new CardDatabase(path.join(__dirname, '../assets/AllPrintings.sqlite'));
const db = new Database('database.sqlite');

const app = express();

useDeckApi(app, db, cDb);

app.listen(PORT, () => {
	console.log(`Listening on port ${PORT}`);
});
