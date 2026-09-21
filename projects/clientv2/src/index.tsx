import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/app';
import './assets/common.css';

const appElement = document.getElementById('app');
if (!appElement) throw new Error('Missing app element');

createRoot(appElement).render(<App />);
