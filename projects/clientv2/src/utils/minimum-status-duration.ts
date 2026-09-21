export const MINIMUM_STATUS_DURATION_MS = 400;

export async function waitForMinimumStatusDuration(
	startedAt: number
): Promise<void> {
	const remaining =
		MINIMUM_STATUS_DURATION_MS - (performance.now() - startedAt);
	if (remaining > 0) {
		await new Promise<void>((resolve) => setTimeout(resolve, remaining));
	}
}

export async function withMinimumStatusDuration<T>(
	work: () => Promise<T>
): Promise<T> {
	const startedAt = performance.now();
	try {
		return await work();
	} finally {
		await waitForMinimumStatusDuration(startedAt);
	}
}
