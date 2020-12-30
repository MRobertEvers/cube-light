import { OnMessageHandler, OnMessageResponseHandler } from './workerToolkit';

export function createOnMessageHandler(
	handler: OnMessageHandler
): (event: MessageEvent) => Promise<void> {
	return async function handleOnMessage(event: MessageEvent) {
		const message = event.data;

		const result = await handler(message);

		postMessage(result);
	};
}

export function createOnMessageResponseHandler(
	handler: OnMessageResponseHandler
): (event: MessageEvent) => Promise<void> {
	return async function handleOnMessage(event: MessageEvent) {
		const message = event.data;

		await handler(message);
	};
}
