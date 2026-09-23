import { selectScans } from '../../../redux/scans/scans.selectors';
import { useAppSelector } from '../../../redux/use-app-selector';

/** Photos being scanned on this device. */
export function useImageImportQueue() {
	return useAppSelector(selectScans);
}
