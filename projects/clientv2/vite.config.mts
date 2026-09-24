import { fileURLToPath, URL } from 'node:url';
import { cp } from 'node:fs/promises';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { buildShellWorker, serveShellWorker } from './tools/shell-worker.mjs';

// tools/vite.mjs loads this named export through Vite's programmatic API.
export const config = defineConfig({
	plugins: [
		react(),
		serveShellWorker({ root: fileURLToPath(new URL('./', import.meta.url)) }),
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
				await buildShellWorker({ root, outDir: path.join(root, 'dist') });
			}
		}
	],
	resolve: {
		alias: {
			src: fileURLToPath(new URL('./src', import.meta.url))
		}
	},
	server: {
		proxy: { '/api': { target: 'http://127.0.0.1:4040', changeOrigin: false, headers: { 'X-Forwarded-Prefix': '/api' }, rewrite: function (url) { return url.replace(/^\/api/, ''); } } },
		port: 3000,
		strictPort: true,
		host: true,
		allowedHosts: ['.local', '.trycloudflare.com', '.ngrok-free.app', '.ngrok.io', '.ts.net', '.loca.lt']
	},
	preview: {
		proxy: { '/api': { target: 'http://127.0.0.1:4040', changeOrigin: false, headers: { 'X-Forwarded-Prefix': '/api' }, rewrite: function (url) { return url.replace(/^\/api/, ''); } } },
		port: 3000,
		host: true,
		allowedHosts: ['.local', '.trycloudflare.com', '.ngrok-free.app', '.ngrok.io', '.ts.net', '.loca.lt']
	},
	build: {
		outDir: 'dist',
		copyPublicDir: false,
		// Mana symbols stay separate fingerprinted files: cached for good, and not
		// inlined into the bundle, since most pages show only a few of them.
		assetsInlineLimit: function (file) {
			return file.includes('/mana-symbols/') ? false : undefined;
		}
	}
});
