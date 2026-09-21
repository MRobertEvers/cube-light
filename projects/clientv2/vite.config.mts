import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			src: fileURLToPath(new URL('./src', import.meta.url))
		}
	},
	server: {
		host: true,
		allowedHosts: ['.local']
	},
	preview: {
		host: true,
		allowedHosts: ['.local']
	},
	build: {
		outDir: 'dist'
	}
});
