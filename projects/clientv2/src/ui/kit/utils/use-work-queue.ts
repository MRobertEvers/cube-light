import { selectWorkError, selectWorkItems } from '../../../redux/scans/scans.selectors';
import { useAppSelector } from '../../../redux/use-app-selector';

/** Photos queued for a desktop. `items` is null until the first read. */
export function useWorkQueue() {
	const items = useAppSelector(selectWorkItems);
	const error = useAppSelector(selectWorkError);
	return { items, error };
}
