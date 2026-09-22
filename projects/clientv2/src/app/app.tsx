import * as React from 'react';
import { Provider } from 'react-redux';

import { Routes } from './routes';
import { AuthGate } from '../components/Auth/AuthGate';
import { configureStore } from '../store/configure-store';
import { startDeferredWorkRunner } from '../utils/deferred-work-runner';
import { OfflineStatus } from '../components/OfflineStatus/OfflineStatus';

import '../assets/common.css';

const store = configureStore();

export function App() {
	return (
		<Provider store={store}>
			<AuthGate>
				<SignedInApp />
			</AuthGate>
		</Provider>
	);
}

/** Mounted only with a session: the work runner polls routes that require one. */
function SignedInApp() {
	React.useEffect(startDeferredWorkRunner, []);

	return (
		<div className={'application-container'}>
			<Routes />
			<OfflineStatus />
		</div>
	);
}
