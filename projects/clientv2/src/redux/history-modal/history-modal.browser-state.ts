import type { HistoryModalEntry } from './history-modal.types';

const HISTORY_STATE_KEY = '__cubeLightModal';

export function deserializeHistoryModal(
	state: unknown
): HistoryModalEntry | null {
	if (!state || typeof state !== 'object') return null;
	return deserializeEntry(
		(state as Record<string, unknown>)[HISTORY_STATE_KEY],
		0
	);
}

function deserializeEntry(
	value: unknown,
	depth: number
): HistoryModalEntry | null {
	if (!value || typeof value !== 'object' || depth > 20) return null;
	const {
		scope,
		value: modalValue,
		parent
	} = value as Record<string, unknown>;
	if (typeof scope !== 'string') return null;
	return {
		scope,
		value: modalValue,
		parent: deserializeEntry(parent, depth + 1)
	};
}

export function serializeHistoryModal(
	state: unknown,
	entry: HistoryModalEntry
): Record<string, unknown> {
	const currentState = state && typeof state === 'object' ? state : {};
	return Object.assign({}, currentState, {
		[HISTORY_STATE_KEY]: entry
	});
}

export function findHistoryModal(
	entry: HistoryModalEntry | null,
	scope: string
): HistoryModalEntry | null {
	let current = entry;
	while (current && current.scope !== scope) current = current.parent;
	return current;
}
