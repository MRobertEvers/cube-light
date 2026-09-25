import type { ReactNode } from 'react';
import type { CardPrinting } from '../../../../domain/models/card';

/** What every printing picker needs, whether it shows art or text. */
export type PrintingPickerOfflineProps = {
	printings: CardPrinting[];
	selectedUuid: string | null;
	onSelect: (uuid: string) => void;
	/** Radio group name; must be unique on the page. */
	name: string;
	disabled?: boolean;
	/** Grows to fill a flex column and scrolls the list, instead of a fixed-height list. */
	fill?: boolean;
	/** Shown in place of the list while there are no printings, keeping the picker's footprint. */
	placeholder?: ReactNode;
	'aria-label'?: string;
	'aria-labelledby'?: string;
};

/** The art picker also needs to know which image its grid shows. */
export type PrintingPickerOnlineProps = PrintingPickerOfflineProps & {
	/** Which image the grid view shows. Compact rows always prefer the art crop. */
	image: 'card' | 'art';
};
