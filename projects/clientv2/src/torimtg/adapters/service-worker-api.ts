import type { LocalNotice, ServiceWorkerApi } from '../types';

export class BrowserServiceWorkerApi implements ServiceWorkerApi {
	private registration: ServiceWorkerRegistration | null = null;
	private connecting: Promise<void> | null = null;
	private readonly listeners = new Set<(notice: LocalNotice) => void>();
	private listening = false;

	connect(): Promise<void> {
		if (this.registration?.active) return Promise.resolve();
		if (this.connecting) return this.connecting;
		this.connecting = this.register().finally(() => {
			this.connecting = null;
		});
		return this.connecting;
	}

	private async register(): Promise<void> {
		if (!('serviceWorker' in navigator) || !isSecureContext)
			throw new Error(
				'Offline synchronization requires HTTPS or localhost. Local changes remain saved.'
			);
		if (!this.listening) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data?.protocolVersion === 1 && event.data?.type === 'SYNC_PENDING') { void this.wake().catch(() => undefined); return; }
				if (
					event.data?.protocolVersion !== 1 ||
					event.data?.type !== 'LOCAL_CHANGED'
				)
					return;
				for (const listener of this.listeners)
					listener(event.data.notice);
			});
			this.listening = true;
		}
		await navigator.serviceWorker.register('/sw.js', {
			scope: '/',
			updateViaCache: 'none'
		});
		this.registration = await Promise.race([
			navigator.serviceWorker.ready,
			new Promise<never>((_resolve, reject) =>
				setTimeout(
					() =>
						reject(
							new Error(
								'The offline worker did not become ready.'
							)
						),
					15000
				)
			)
		]);
		await this.send({ type: 'HELLO' });
	}

	private async send(message: Record<string, unknown>): Promise<void> {
		const worker = this.registration?.active;
		if (!worker) throw new Error('Synchronization worker unavailable.');
		await new Promise<void>((resolve, reject) => {
			const channel = new MessageChannel();
			const timeout = setTimeout(
				() => {
					channel.port1.close();
					reject(
						new Error('The synchronization worker did not respond.')
					);
				},
				message.type === 'AUTH' ? 45000 : 5000
			);
			channel.port1.onmessage = function (event) {
				clearTimeout(timeout);
				channel.port1.close();
				if (event.data?.protocolVersion !== 1 || event.data?.error)
					reject(
						new Error(
							event.data?.error || 'Incompatible worker version.'
						)
					);
				else resolve();
			};
			worker.postMessage({ protocolVersion: 1, ...message }, [
				channel.port2
			]);
		});
	}

	async wake(): Promise<void> {
		await this.connect();
		await this.send({ type: 'WAKE' });
		const sync = (
			this.registration as ServiceWorkerRegistration & {
				sync?: { register(tag: string): Promise<void> };
			}
		).sync;
		await sync?.register('torimtg-sync').catch(() => undefined);
	}
	async authenticate(
		id: string,
		credentials?: { username: string; password: string }
	): Promise<void> {
		await this.connect();
		await this.send({
			type: 'AUTH',
			id,
			...(credentials ? { credentials } : {})
		});
	}
	subscribe(listener: (notice: LocalNotice) => void): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}
}
