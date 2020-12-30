interface Message<T, Response = void, Key extends string = string> {
	readonly type: Key;
	payload: T;
}

interface MessageCreator<T, Response = void, Key extends string = string> {
	(payload: T): Message<T, Response, Key>;
	readonly type: Key;
}

export function createMessage<T, Response, Key extends string = string>(
	name: Key
): MessageCreator<T, Response, Key> {
	const creator = (payload: T) => {
		return {
			type: name,
			payload: payload
		};
	};

	creator.type = name;
	return creator;
}

type MessageHandler<T, Response = void, Key extends string = string> =
	| ((msg: Message<T, Response, Key>) => Response)
	| ((msg: Message<T, Response, Key>) => Promise<Response>);

class MessageHandlerMapBuilder {
	private messageHandlerMap: { [x: string]: MessageHandler<any, any, any> };

	constructor(initialHandlers: { [x: string]: MessageHandler<any, any, any> }) {
		this.messageHandlerMap = initialHandlers;
	}

	addCase<T, Response = void, Key extends string = string>(
		gen: MessageCreator<T, Response, Key>,
		handler: MessageHandler<T, Response, Key>
	): MessageHandlerMapBuilder {
		this.messageHandlerMap[gen.type] = handler;

		return this;
	}
}

class MessageResponseHandlerMapBuilder {
	private messageHandlerMap: { [x: string]: MessageHandler<any, any, any> };

	constructor(initialHandlers: { [x: string]: MessageHandler<any, any, any> }) {
		this.messageHandlerMap = initialHandlers;
	}

	addCase<T, Response = void, Key extends string = string>(
		gen: MessageCreator<T, Response, Key>,
		handler: MessageHandler<Response, void, Key>
	): MessageResponseHandlerMapBuilder {
		this.messageHandlerMap[gen.type] = handler;

		return this;
	}
}
export interface OnMessageHandler {
	<T, Response = void, Key extends string = string>(msg: Message<T, Response, Key>): Promise<
		Message<Response, void, Key> | undefined
	>;
}

export interface OnMessageResponseHandler {
	<T, Response = void, Key extends string = string>(
		msg: Message<Response, void, Key>
	): Promise<void>;
}
function createHandleMessage(map: { [x: string]: MessageHandler<any, any> }): OnMessageHandler {
	const handler: OnMessageHandler = async <T, Response, Key extends string>(
		msg: Message<T, Response, Key>
	): Promise<Message<Response, void, Key> | undefined> => {
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
