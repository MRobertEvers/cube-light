import http from 'http';

interface ServerConfig {
	host: string;
	port: number;
}

export class Server {
	private config: ServerConfig;
	private router: http.RequestListener;
	private server: http.Server | undefined;

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
		return new Promise((resolve, reject) => {
			if (this.server) {
				this.server.close((err) => {
					if (err) {
						reject(err);
					} else {
						resolve();
					}
				});
			}
		});
	}
}
