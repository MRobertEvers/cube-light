import { useHotkey } from '../hotkeys/Hotkeys';

/**
 * Calls onClose when Escape is pressed while enabled. It goes through the
 * hotkey registry, so only the topmost chrome (dialog, sheet, menu) closes.
 */
export function useCloseOnEscape(onClose: () => void, enabled = true) {
	useHotkey('Escape', onClose, { enabled });
}
