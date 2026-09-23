import { config } from './vite.config.mts';
for (const key of ['server', 'preview'])
	config[key].proxy['/api'].target = 'http://127.0.0.1:4047';
process.argv = [process.argv[0], 'tools/vite.mjs', 'dev', '--port', '3017', '--strictPort'];
await import('./tools/vite.mjs');
