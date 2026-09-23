import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Dispatch, Reducer } from 'redux';
import type { StoreState } from '../../../state/root-reducers';
import { useStore } from '../../../state/use-store';

export function useReducer<T>(
	name: string,
	reducer: Reducer<T>,
	initial: T
): [T, Dispatch<any>, string] {
	const store = useStore();

	const key = name;

	useEffect(() => {
		const reducerMap = store.reducerManager.getReducerMap();
		if (reducerMap[key]) {
			return;
		}

		store.reducerManager.add(key, reducer as Reducer<unknown>);
		return function () {
			store.reducerManager.remove(key);
		};
	}, [key, reducer, store]);

	const state = useSelector((root: StoreState) => root[key] as T | undefined);

	return [state || initial, useDispatch(), key];
}
