import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/app';
import { composeApp } from './app/compose-app';
import './assets/common.css';

const appElement = document.getElementById('app');
if (!appElement) throw new Error('Missing app element');

const store = composeApp();
createRoot(appElement).render(
	<App store={store} />
);
