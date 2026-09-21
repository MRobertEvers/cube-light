import { useEffect, useRef, useState } from 'react';
import { MINIMUM_STATUS_DURATION_MS } from '../utils/minimum-status-duration';

export function useMinimumVisible(active: boolean): boolean {
	const startedAt = useRef<number | null>(active ? performance.now() : null);
	const [visible, setVisible] = useState(active);

	useEffect(() => {
		if (active) {
			if (startedAt.current === null) startedAt.current = performance.now();
			setVisible(true);
			return;
		}
		if (!visible) return;
		const remaining = MINIMUM_STATUS_DURATION_MS - (performance.now() - (startedAt.current ?? performance.now()));
		const timer = window.setTimeout(() => {
			startedAt.current = null;
			setVisible(false);
		}, Math.max(0, remaining));
		return () => window.clearTimeout(timer);
	}, [active, visible]);

	return active || visible;
}
