import { useSelector } from 'react-redux';
import type { RootState } from './root-reducers';

/** useSelector over RootState, so selectors and inline reads need no root type of their own. */
export const useAppSelector = useSelector.withTypes<RootState>();
