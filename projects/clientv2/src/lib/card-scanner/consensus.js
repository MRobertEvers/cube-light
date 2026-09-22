import { bounds, sameLine } from './photo-match.js';

// Development-fixture heuristic, not calibrated confidence. Both sources must
// independently rank the same catalog name first at the same image location.
export function addTextConsensus(
	existing,
	glmRows,
	opticalRows,
	verifier = 'GLM'
) {
	const candidates = [...existing];
	for (const row of glmRows) {
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
