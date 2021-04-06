import { useStore as useStoreRedux } from 'react-redux';
import { StoreType } from './configure-store';

export function useStore(): StoreType {
	return useStoreRedux() as any;
}
