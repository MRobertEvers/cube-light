import {
	ReducersMapObject,
	combineReducers,
	Reducer,
	UnknownAction
} from 'redux';

export type ReducerManager<T> = {
	getReducerMap: () => ReducersMapObject<T>;
	reduce: Reducer<T>;
	add: <K extends keyof T>(key: K, reducer: Reducer<T[K]>) => void;
	remove: (key: keyof T) => void;
};

export function createReducerManager<T>(
	initialReducers: ReducersMapObject<T>
): ReducerManager<T> {
	// Create an object which maps keys to reducers
	const reducers: Record<string, Reducer<any>> = { ...initialReducers };

	// Create the initial combinedReducer
	const combine = () => combineReducers(reducers) as unknown as Reducer<T>;
	let combinedReducer = combine();

	// An array which is used to delete state keys when reducers are removed
	let keysToRemove: Array<keyof T> = [];

	return {
		getReducerMap: () => reducers as ReducersMapObject<T>,

		// The root reducer function exposed by this object
		// This will be passed to the store
		reduce: (state: T | undefined, action: UnknownAction) => {
			// If any reducers have been removed, clean up their state first
			if (state && keysToRemove.length > 0) {
				state = { ...state };
				for (const key of keysToRemove) {
					delete state[key];
				}
				keysToRemove = [];
			}

			// Delegate to the combined reducer
			return combinedReducer(state ?? undefined, action);
		},

		// Adds a new reducer with the specified key
		add: <K extends keyof T>(key: K, reducer: Reducer<T[K]>) => {
			if (!key || reducers[key as string]) {
				return;
			}

			// Add the reducer to the reducer mapping
			reducers[key as string] = reducer;

			// Generate a new combined reducer
			combinedReducer = combine();
		},

		// Removes a reducer with the specified key
		remove: (key: keyof T) => {
			if (!key || !reducers[key as string]) {
				return;
			}

			// Remove it from the reducer mapping
			delete reducers[key as string];

			// Add the key to the list of keys to clean up
			keysToRemove.push(key);

			// Generate a new combined reducer
			combinedReducer = combine();
		}
	};
}
