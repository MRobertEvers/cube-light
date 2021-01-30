import * as React from 'react';
import { Provider } from 'react-redux';

import { Routes } from './routes';
import { configureStore } from '../store/configure-store';

import styles from '../assets/common.css';

const store = configureStore();

export function App() {
	return (
		<Provider store={store}>
			<div className={styles['application-container']}>
				<Routes />
			</div>
		</Provider>
	);
}
