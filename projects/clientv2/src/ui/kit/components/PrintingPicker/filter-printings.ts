import type { CardPrinting } from '../../../../domain/models/card';

/** The printings whose set code or set name contains what the person typed. */
export function filterPrintings(printings: CardPrinting[], query: string): CardPrinting[] {
	const needle = query.trim().toLowerCase();
	if (!needle) return printings;
	return printings.filter(
		(printing) =>
			printing.setCode.toLowerCase().includes(needle) ||
			!!printing.setName?.toLowerCase().includes(needle)
	);
}
