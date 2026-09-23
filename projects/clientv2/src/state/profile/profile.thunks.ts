import type { PrintingView } from '../../domain/models/session';
import type { AppThunk } from '../thunk';

/** The saved printing view, or null before one is saved. */
export function readPrintingView(): AppThunk<Promise<PrintingView | null>> {
	return function (_dispatch, _getState, engine) {
		return engine.profile.printingView();
	};
}

export function savePrintingView(view: PrintingView): AppThunk<Promise<void>> {
	return function (_dispatch, _getState, engine) {
		return engine.profile.setPrintingView(view);
	};
}
