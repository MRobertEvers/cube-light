import express from 'express';
import { Server } from './server/Server';
import path from 'path';

import { CardDatabase } from './database/cards/database';
import { Database } from './database/main/Database';
import { MessageBus } from './message/MessageBus';
import { Services } from './app/services/Services';

const PORT = 4040;

async function main() {
	const messageBus = new MessageBus();

	const cardDatabase = new CardDatabase(path.join(__dirname, '../assets/AllPrintings.sqlite'));
	const database = await Database.connect('database.sqlite');

	const app = express();

	const services = new Services(messageBus);

	const server = new Server(
		{
			port: PORT,
			host: 'localhost'
		},
		app
	);

	server.start();
}

main();
