import { EventEmitter } from 'events';

export type Message<T, R> = { type: string; data: T };
export interface MessageCreator<T, R> {
	type: string;
	(args: T): Message<T, R>;
}

const MESSAGE_KEYS: Set<string> = new Set();
/**
 * Creates a message definition.
 *
 * @throws Error if name already in use.
 * @param name Unique Identifier for message.
 * @template T Data to be passed to receiver.
 * @template R Data expected from receiver.
 */
export function createMessage<T, R = void>(name: string): MessageCreator<T, R> {
	if (MESSAGE_KEYS.has(name)) {
		throw new Error(`Message definitions must have unique names; '${name}' already exists.`);
	}

	MESSAGE_KEYS.add(name);

	const messageCreator = (arg: T) => ({
		type: name,
		data: arg
	});

	messageCreator.type = name;

	return messageCreator;
}

function toChannelResponseType<T, R>(
	event: Message<T, R> | MessageCreator<T, R>,
	channel: number
): string {
	return `${event.type}/response/${channel}`;
}

// function toResponseMessageType<T, R>(event: Message<T, R> | MessageCreator<T, R>): string {
// 	return `${event.type}/response`;
// }
type InternalMessage<T> = {
	channel: number;
	data: T;
};
export class MessageBus {
	private emitter: EventEmitter;
	private messageId: number = 0;

	constructor() {
		this.emitter = new EventEmitter();
	}

	private emit<T, R>(message: Message<T, R>, channel: number) {
		this.emitter.emit(message.type, {
			channel: channel,
			data: message.data
		});
	}

	private getNextResponseChannel<T, R>() {
		this.messageId += 1;
		return this.messageId;
	}

	fire<T, R>(event: Message<T, R>): void {
		this.emit(event, 0);
	}

	request<T, R>(event: Message<T, R>): Promise<R> {
		const responseChannelId = this.getNextResponseChannel();

		if (this.emitter.listenerCount(event.type) === 0) {
			throw new Error(
				`request will never return because there are no listeners; ${event.type}`
			);
		}

		return new Promise((resolve, reject) => {
			const channel = toChannelResponseType(event, responseChannelId);
			const cb = (args: R) => {
				this.emitter.off(channel, cb);
				resolve(args);
			};
			this.emitter.on(channel, cb);

			this.emit(event, responseChannelId);
		});
	}

	on<T, R>(
		event: MessageCreator<T, R>,
		handler: ((args: T) => R) | ((args: T) => Promise<R>)
	): void {
		this.emitter.on(event.type, async (message: InternalMessage<T>) => {
			const { channel, data } = message;

			// Promise.resolve will turn a non-promise, into a promise that resolve immediately,
			// but do nothing otherwise.
			const awaitable = Promise.resolve(handler(data));
			const result = await awaitable;

			this.emitter.emit(toChannelResponseType(event, channel), result);
		});
	}

	listen<T, R>(event: MessageCreator<T, R>, handler: (args: T) => any): void {
		this.emitter.on(event.type, async (message: InternalMessage<T>) => {
			const { channel, data } = message;

			handler(data);
		});
	}
}
