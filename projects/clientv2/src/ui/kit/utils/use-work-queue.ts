import { useSelector } from 'react-redux';
import { selectWorkError, selectWorkItems } from '../../../state/scans/scans.state';

/** Photos queued for a desktop. `items` is null until the first read. */
export function useWorkQueue() {
	const items = useSelector(selectWorkItems);
	const error = useSelector(selectWorkError);
	return { items, error };
}
