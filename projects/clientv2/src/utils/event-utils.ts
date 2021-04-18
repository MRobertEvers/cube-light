export interface Event<T, Key extends string> {
	readonly type: Key;
	payload: T;
}

export type EventCreator<T, Key extends string> = (args: T) => Event<T, Key>;

/**
 * Attention: This a workaround the TS inference system.
 * @returns
 */
export function createEvent<T = void>() {
	return function event<Key extends string>(type: Key): EventCreator<T, Key> {
		return (args: T) => ({
			type: type,
			payload: args
		});
	};
}

export type EventType<E extends Record<string, EventCreator<any, any>>> = ReturnType<E[keyof E]>;

// const Events = {
// 	create: createEvent<string>()('create'),
// 	add: createEvent<{ add: boolean }>()('add')
// };

// type Ty = EventType<typeof Events>;

// function myf(e: Ty)
// {
//     if (e.type === '')
// }
