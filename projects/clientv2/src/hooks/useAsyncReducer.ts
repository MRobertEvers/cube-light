import { Dispatch, Reducer, useReducer } from 'react';

export function useAsyncReducer<State, Action>(
	reducer: Reducer<State, Action>,
	initialState: State
): [State, Dispatch<Action>] {
	return useReducer(reducer, initialState);
}
