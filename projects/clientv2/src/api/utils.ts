export async function fetchTimeout(
	input: RequestInfo,
	init?: RequestInit & {
		timeout?: number;
	}
): Promise<Response> {
	const { timeout = 10000, ...otherInit } = init || {};
	return new Promise(async (resolve, reject) => {
		const t = setTimeout(() => {
			reject('Query Timed Out');
		}, timeout);

		try {
			const result = await fetch(input, otherInit);
			resolve(result);
		} catch (e) {
			reject(e);
		} finally {
			clearTimeout(t);
		}
	});
}
