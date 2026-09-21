import React, { useState } from 'react';
import { PropsWithChildren } from 'react';
import { HeaderBackSlotContext } from '../Header/HeaderBackSlot';

type PageFrameProps = PropsWithChildren<{
	/** Renders the page's top bar, which must place the back slot it is handed. */
	renderHeader: (backSlotRef: React.Ref<HTMLDivElement>) => React.ReactNode;
}>;

/** A page under any top bar. Most pages want Page, which uses the site Header. */
export function PageFrame(props: PageFrameProps) {
	const { renderHeader, children } = props;
	// State, not a ref, so back links re-render and portal in once the slot mounts.
	const [backSlot, setBackSlot] = useState<HTMLElement | null>(null);

	return (
		<>
			{renderHeader(setBackSlot)}
			<HeaderBackSlotContext.Provider value={backSlot}>
				{children}
			</HeaderBackSlotContext.Provider>
		</>
	);
}
