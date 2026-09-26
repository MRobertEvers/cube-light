import * as React from 'react';
import { Provider } from 'react-redux';

import { Routes } from './routes';
import { AuthGate } from '../ui/kit/components/Auth/AuthGate';
import type { StoreType } from '../redux/configure-store';
import { useAppDispatch } from '../redux/use-app-dispatch';
import { useAppSelector } from '../redux/use-app-selector';
import { selectConnectivity } from '../redux/connectivity/connectivity.selectors';
import { checkOfflineDataUpdates } from '../redux/offline-data/offline-data.thunks';
import {
	runQueuedScansHere,
	watchWorkQueue
} from '../redux/scans/scans.thunks';
import { PwaInstallProvider } from '../ui/kit/components/InstallApp/PwaInstallProvider';
import { OfflineArtOfferReduxWidget } from '../ui/features/offline-art/OfflineArtOfferReduxWidget';
import { HotkeyRegistry } from '../ui/kit/hotkeys/hotkey-registry';
import { HotkeysProvider } from '../ui/kit/hotkeys/Hotkeys';

import '../assets/common.css';

export type AppProps = { store: StoreType };

export function App(props: AppProps) {
	const { store } = props;
	const [hotkeys] = React.useState(
		() =>
			new HotkeyRegistry({
				target: window,
				activeElement: () => document.activeElement,
				isApple: /Mac|iPhone|iPad/.test(navigator.platform)
			})
	);
	React.useEffect(
		() =>
			function () {
				hotkeys.dispose();
			},
		[hotkeys]
	);
	return (
		<Provider store={store}>
			<HotkeysProvider registry={hotkeys}>
				<PwaInstallProvider>
					<AuthGate>
						<SignedInApp />
					</AuthGate>
				</PwaInstallProvider>
			</HotkeysProvider>
		</Provider>
	);
}

/**
 * Mounted only with a session: the queue and the scan runner need one. Each time the server
 * comes within reach, it asks whether installed offline data has an update.
 */
function SignedInApp() {
	const dispatch = useAppDispatch();
	const online = useAppSelector(selectConnectivity) === 'online';
	React.useEffect(() => {
		if (online) void dispatch(checkOfflineDataUpdates()).catch(() => {});
	}, [dispatch, online]);
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
			<OfflineArtOfferReduxWidget />
		</div>
	);
}
