import { bounds, sameLine } from './photo-match.js';

// Development-fixture heuristic, not calibrated confidence. Both sources must
// independently rank the same catalog name first at the same image location.
/**
 * @param {Array<{name: string, status: string, text: string, poly: import('./types.js').Polygon, box: import('./types.js').Bounds, evidence?: object}>} existing
 * @param {Array<{poly: import('./types.js').Polygon, result?: {ranked?: Array<{name: string, rawTokenSupport: number}>, searchGap: number}}>} verifierRows
 * @param {Array<{poly: import('./types.js').Polygon, candidates?: import('./types.js').NameMatch[]}>} opticalRows
 * @param {string} [verifierArg]
 */
export function addTextConsensus(
	existing,
	verifierRows,
	opticalRows,
	verifierArg
) {
	const verifier =
		verifierArg === undefined ? 'Paddle v6 medium' : verifierArg;

	const candidates = [...existing];
	for (const row of verifierRows) {
		const best = row.result?.ranked?.[0];
		if (
			!best ||
			best.name.replace(/[^a-z]/gi, '').length < 8 ||
			best.rawTokenSupport < 0.03 ||
			row.result.searchGap < 0.15
		)
			continue;
		const box = bounds(row.poly);
		const optical = opticalRows.find(
			(other) =>
				other.candidates?.[0]?.name === best.name &&
				other.candidates[0].score >= 0.5 &&
				sameLine(box, bounds(other.poly))
		);
		if (!optical || candidates.some((other) => sameLine(other.box, box)))
			continue;
		candidates.push({
			name: best.name,
			status: 'accepted',
			text: `${verifier} / printed-name agreement`,
			poly: row.poly,
			box,
			evidence: {
				verifierRawSupport: best.rawTokenSupport,
				verifierSearchGap: row.result.searchGap,
				opticalScore: optical.candidates[0].score
			}
		});
	}
	return candidates;
}
