/** An edit saved on this device that the server has not accepted yet. */
export type PendingEdit = {
	operationId: string;
	status: 'queued' | 'sending' | 'retry' | 'accepted' | 'conflict' | 'rejected' | 'discarded';
	error: string | null;
	command: { type: string };
};
