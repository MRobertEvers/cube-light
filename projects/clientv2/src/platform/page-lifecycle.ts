import type { PageLifecycle } from '../engine/ports';

/** Browser focus, visibility, network and unload events, for the engine's wake-ups. */
export class BrowserPageLifecycle implements PageLifecycle {
	onResume(listener: () => void): () => void {
		function onVisibilityChange() {
			if (document.visibilityState === 'visible') listener();
		}
		window.addEventListener('online', listener);
		window.addEventListener('focus', listener);
		document.addEventListener('visibilitychange', onVisibilityChange);
		return function stop() {
			window.removeEventListener('online', listener);
			window.removeEventListener('focus', listener);
			document.removeEventListener('visibilitychange', onVisibilityChange);
		};
	}

	onLeave(listener: () => void): () => void {
		window.addEventListener('pagehide', listener);
		return function stop() {
			window.removeEventListener('pagehide', listener);
		};
	}

	isVisible(): boolean {
		return document.visibilityState === 'visible';
	}
}
