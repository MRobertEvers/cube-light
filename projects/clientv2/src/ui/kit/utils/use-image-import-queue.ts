import { useSelector } from 'react-redux';
import { selectScans } from '../../../state/scans/scans.state';

/** Photos being scanned on this device. */
export function useImageImportQueue() {
	return useSelector(selectScans);
}
