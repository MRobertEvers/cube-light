import type { ImportedCard } from 'src/api/fetch-api-import-cards';
import type { CardImageCandidate } from './card-image-ocr';

/** All candidates have already resolved to canonical names from the card-name index. */
export function resolvedCandidateAdditions(
	candidates: CardImageCandidate[],
	plannedCounts: Record<string, number>
): ImportedCard[] {
	const totals = new Map<string, number>();
	for (const candidate of candidates) {
		totals.set(candidate.name, (totals.get(candidate.name) ?? 0) + 1);
	}
	const additions: ImportedCard[] = [];
	for (const [name, total] of totals) {
		const delta = total - (plannedCounts[name] ?? 0);
		if (delta > 0) additions.push({ name, count: delta });
	}
	return additions;
}
