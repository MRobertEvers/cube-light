import * as React from 'react';
import { Provider } from 'react-redux';

import { Routes } from './routes';
import { AuthGate } from '../ui/kit/components/Auth/AuthGate';
import type { StoreType } from '../state/configure-store';
import { useAppDispatch } from '../state/use-app-dispatch';
import { runQueuedScansHere, watchWorkQueue } from '../state/scans/scans.state';
import { OfflineStatus } from '../ui/kit/components/OfflineStatus/OfflineStatus';
import { PwaInstallProvider } from '../ui/kit/components/InstallApp/PwaInstallProvider';

import '../assets/common.css';

export type AppProps = { store: StoreType };

export function App(props: AppProps) {
	const { store } = props;
	return (
		<Provider store={store}>
			<PwaInstallProvider>
				<AuthGate>
					<SignedInApp />
				</AuthGate>
			</PwaInstallProvider>
		</Provider>
	);
}

/** Mounted only with a session: the queue and the scan runner need one. */
function SignedInApp() {
	const dispatch = useAppDispatch();
	React.useEffect(() => {
		const stopWatching = dispatch(watchWorkQueue());
		const stopRunning = dispatch(runQueuedScansHere());
		return function () {
			stopRunning();
			stopWatching();
		};
	}, [dispatch]);

	return (
		<div className={'application-container'}>
			<Routes />
			<OfflineStatus />
		</div>
	);
}
