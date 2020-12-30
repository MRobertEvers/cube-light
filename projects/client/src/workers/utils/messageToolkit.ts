export interface Message<T, Response = void> {
	readonly type: string;
	payload: T;
}

export interface MessageCreator<T, Response = void> {
	(payload: T): Message<T, Response>;
	readonly type: string;
}

export function createMessage<T, Response = void>(name: string): MessageCreator<T, Response> {
	const creator = (payload: T) => {
		return {
			type: name,
			payload: payload
		};
	};

	creator.type = name;
	return creator;
}

type MessageHandler<T, Response = void> =
	| ((msg: Message<T, Response>) => Response)
	| ((msg: Message<T, Response>) => Promise<Response>);

class MessageHandlerMapBuilder {
	private messageHandlerMap: { [x: string]: MessageHandler<any, any> };

	constructor(initialHandlers: { [x: string]: MessageHandler<any, any> }) {
		this.messageHandlerMap = initialHandlers;
	}

	addCase<T, Response = void>(
		gen: MessageCreator<T, Response>,
		handler: MessageHandler<T, Response>
	): MessageHandlerMapBuilder {
		this.messageHandlerMap[gen.type] = handler;

		return this;
	}
}

class MessageResponseHandlerMapBuilder {
	private messageHandlerMap: { [x: string]: MessageHandler<any, any> };

	constructor(initialHandlers: { [x: string]: MessageHandler<any, any> }) {
		this.messageHandlerMap = initialHandlers;
	}

	addCase<T, Response = void>(
		gen: MessageCreator<T, Response>,
		handler: MessageHandler<Response, void>
	): MessageResponseHandlerMapBuilder {
		this.messageHandlerMap[gen.type] = handler;

		return this;
	}
}
export interface OnMessageHandler {
	<T, Response = void>(msg: Message<T, Response>): Promise<Message<Response, void> | undefined>;
}

export interface OnMessageResponseHandler {
	<T, Response = void>(msg: Message<Response, void>): Promise<void>;
}
function createHandleMessage(map: { [x: string]: MessageHandler<any, any> }): OnMessageHandler {
	const handler: OnMessageHandler = async <T, Response>(
		msg: Message<T, Response>
	): Promise<Message<Response, void> | undefined> => {
		if (msg.type in map) {
			const cb: MessageHandler<T, Response> = map[msg.type];

			const awaitable = Promise.resolve(cb(msg));
			const result = await awaitable;

			return {
				type: msg.type,
				payload: result
			};
		}
	};

	return handler;
}

export function createResponseHandler(
	mapper: (builder: MessageResponseHandlerMapBuilder) => MessageResponseHandlerMapBuilder
): OnMessageResponseHandler {
	const map: { [x: string]: MessageHandler<any> } = {};
	mapper(new MessageResponseHandlerMapBuilder(map));

	const handler = createHandleMessage(map);

	return handler as OnMessageResponseHandler;
}

export function createHandler(
	mapper: (builder: MessageHandlerMapBuilder) => MessageHandlerMapBuilder
): OnMessageHandler {
	const map: { [x: string]: MessageHandler<any> } = {};
	mapper(new MessageHandlerMapBuilder(map));

	const handler = createHandleMessage(map);

	return handler;
}
