import { useCallback, useLayoutEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import {
	deserializeHistoryModal,
	findHistoryModal,
	type HistoryModalEntry,
	restoreHistoryModal,
	selectHistoryModal,
	serializeHistoryModal
} from '../../../state/history-modal/history-modal.state';
import { useAppDispatch } from '../../../state/use-app-dispatch';

/**
 * Keeps one scope's modal value in Redux and in the current browser-history entry.
 * Opening pushes an entry, Back restores the preceding Redux value, and Forward
 * restores the serialized modal value.
 */
export function useHistoryModal<T>(scope: string) {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const location = useLocation();
	const entry = useSelector(selectHistoryModal);
	const locationEntry = useMemo(
		() => deserializeHistoryModal(location.state),
		[location.state]
	);

	useLayoutEffect(() => {
		dispatch(restoreHistoryModal(locationEntry));
	}, [dispatch, location.key, locationEntry]);

	const open = useCallback(
		(value: T) => {
			const nextEntry: HistoryModalEntry = {
				scope,
				value,
				parent: entry
			};
			navigate(
				{
					pathname: location.pathname,
					search: location.search,
					hash: location.hash
				},
				{
					state: serializeHistoryModal(location.state, nextEntry)
				}
			);
			dispatch(restoreHistoryModal(nextEntry));
		},
		[
			dispatch,
			entry,
			location.hash,
			location.pathname,
			location.search,
			location.state,
			navigate,
			scope
		]
	);

	const close = useCallback(() => {
		if (entry?.scope !== scope) return;
		dispatch(restoreHistoryModal(entry.parent));
		navigate(-1);
	}, [dispatch, entry, navigate, scope]);

	const scopedEntry = findHistoryModal(entry, scope);

	return {
		value: scopedEntry ? (scopedEntry.value as T) : null,
		open,
		close
	};
}
