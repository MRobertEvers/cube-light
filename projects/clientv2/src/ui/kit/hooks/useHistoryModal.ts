import { useCallback, useLayoutEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { deserializeHistoryModal, findHistoryModal, serializeHistoryModal } from '../../../redux/history-modal/history-modal.browser-state';
import { type HistoryModalEntry } from '../../../redux/history-modal/history-modal.types';
import { restoreHistoryModal } from '../../../redux/history-modal/historyModalSlice';
import { selectHistoryModal } from '../../../redux/history-modal/history-modal.selectors';
import { useAppDispatch } from '../../../redux/use-app-dispatch';
import { useAppSelector } from '../../../redux/use-app-selector';

/**
 * Keeps one scope's modal value in Redux and in the current browser-history entry.
 * Opening pushes an entry, Back restores the preceding Redux value, and Forward
 * restores the serialized modal value.
 */
export function useHistoryModal<T>(scope: string) {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const location = useLocation();
	const entry = useAppSelector(selectHistoryModal);
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
