import { createContext, useContext } from 'react';
import { AnyAction, Dispatch, Reducer } from 'redux';
import { useReducer } from './use-reducer';

export type EventContextType = {
	useReducer: <T>(
		name: string,
		reducer: Reducer<T>,
		initial: T
	) => [T, Dispatch<AnyAction>, string];
};

export const EventContext = createContext({
	useReducer: useReducer
});

export const useEventContext = () => useContext(EventContext);
