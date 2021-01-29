import express from 'express';
import http from 'http';
import path from 'path';
import { CardDatabase } from '../database/cards/database';
import { Database } from '../database/app/database';

const PORT = 4040;

const cDb = new CardDatabase(path.join(__dirname, '../assets/AllPrintings.sqlite'));
const db = new Database('database.sqlite');

interface ServerConfig {
	host: string;
	port: number;
}

export class Server {
	private config: ServerConfig;
	private router: http.RequestListener;
	private server: http.Server;

	constructor(config: ServerConfig, router: http.RequestListener) {
		this.router = router;
		this.config = config;
	}

	async start(): Promise<void> {
		const { host, port } = this.config;

		const server = http.createServer(this.router);

		return new Promise((resolve) => {
			this.server = server.listen(port, host, () => {
				console.log(`Started listening on ${host}:${port}`);
				resolve();
			});
		});
	}

	async stop(): Promise<void> {
		if (this.server) {
			return new Promise((resolve, reject) => {
				this.server.close((err) => {
					if (err) {
						reject(err);
					} else {
						resolve();
					}
				});
			});
		}
	}
}
