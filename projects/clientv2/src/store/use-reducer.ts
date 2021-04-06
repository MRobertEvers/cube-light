import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Dispatch, Reducer } from 'redux';
import { useStore } from './use-store';

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

		store.reducerManager.add(key, reducer);
		return () => {
			store.reducerManager.remove(key);
		};
	}, []);

	const state = useSelector((root: any) => root[key]);

	return [state || initial, useDispatch(), key];
}
