import { useStore as useStoreRedux } from 'react-redux';
import type { StoreType } from './configure-store';

export const useStore = useStoreRedux.withTypes<StoreType>();
