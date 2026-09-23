/** The engine's local tables and the key path of each. The storage adapter creates them. */
export const TABLE_KEYS = {
	control: 'key',
	meta: 'partition',
	base: ['partition', 'id'],
	views: ['partition', 'id'],
	checkpoints: ['partition', 'id', 'sequence'],
	events: ['partition', 'id', 'sequence'],
	journal: ['partition', 'sequence'],
	outbox: ['partition', 'operationId'],
	catalog: ['partition', 'id'],
	resources: ['partition', 'key'],
	jobs: ['partition', 'key'],
	blobs: ['partition', 'id']
} as const satisfies Record<string, string | readonly string[]>;

export type TableName = keyof typeof TABLE_KEYS;

export const TABLES = Object.keys(TABLE_KEYS) as TableName[];
