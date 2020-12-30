import { Dispatch, Reducer, ReducerAction, ReducerState, useCallback, useReducer } from 'react';

export function useAsyncReducer<T extends Reducer<any, any>>(
	reducer: T,
	initialState: ReducerState<T>
): [ReducerState<T>, Dispatch<ReducerAction<T>>] {
	const [state, dispatch] = useReducer(reducer, initialState);

	const wrappedDispatch = useCallback(
		(action) => {
			if (typeof action === 'function') {
				action(dispatch);
			} else {
				dispatch(action);
			}
		},
		[reducer]
	);

	return [state, wrappedDispatch];
}
