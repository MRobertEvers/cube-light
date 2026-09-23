import { useEffect, useState } from 'react';
import { selectDataRevision } from '../../../redux/offline/offline.selectors';
import { useAppDispatch } from '../../../redux/use-app-dispatch';
import { useAppSelector } from '../../../redux/use-app-selector';
import type { AppThunk } from '../../../redux/thunk';

type Result<T> = { key: string; value: T | null; failed: boolean };

/**
 * Reads saved data through a thunk, then reads again whenever saved data changes. `key`
 * names what is read: a new key rereads at once and hides the previous key's value.
 */
export function useSavedData<T>(key: string, read: () => AppThunk<Promise<T>>): { value: T | null; failed: boolean } {
	const dispatch = useAppDispatch();
	const revision = useAppSelector(selectDataRevision);
	const [result, setResult] = useState<Result<T> | null>(null);
	useEffect(() => {
		let active = true;
		dispatch(read()).then(
			(value) => {
				if (active) setResult({ key, value, failed: false });
			},
			() => {
				if (active) setResult((current) => ({ key, value: current?.key === key ? current.value : null, failed: true }));
			}
		);
		return function () {
			active = false;
		};
		// `read` is rebuilt every render; `key` says when it reads something else.
	}, [dispatch, key, revision]);
	return result?.key === key ? { value: result.value, failed: result.failed } : { value: null, failed: false };
}
