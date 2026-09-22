import { fileURLToPath, URL } from 'node:url';
import { cp } from 'node:fs/promises';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// tools/vite.mjs loads this named export through Vite's programmatic API.
export const config = defineConfig({
	plugins: [
		react(),
		{
			name: 'copy-public-preserving-model-links',
			closeBundle: async function () {
				const root = fileURLToPath(new URL('./', import.meta.url));
				await cp(path.join(root, 'public'), path.join(root, 'dist'), {
					recursive: true,
					force: true,
					dereference: false,
					verbatimSymlinks: true
				});
			}
		}
	],
	resolve: {
		alias: {
			src: fileURLToPath(new URL('./src', import.meta.url))
		}
	},
	server: {
		port: 3000,
		host: true,
		allowedHosts: ['.local']
	},
	preview: {
		port: 3000,
		host: true,
		allowedHosts: ['.local']
	},
	build: {
		outDir: 'dist',
		copyPublicDir: false
	}
});
