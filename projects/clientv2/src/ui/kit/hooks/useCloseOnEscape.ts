import { useEffect } from 'react';

/** Calls onClose when Escape is pressed anywhere while enabled. */
export function useCloseOnEscape(onClose: () => void, enabled = true) {
	useEffect(() => {
		if (!enabled) return;
		function closeOnEscape(event: KeyboardEvent) {
			if (event.key === 'Escape') onClose();
		}
		window.addEventListener('keydown', closeOnEscape);
		return function () {
			window.removeEventListener('keydown', closeOnEscape);
		};
	}, [enabled, onClose]);
}
