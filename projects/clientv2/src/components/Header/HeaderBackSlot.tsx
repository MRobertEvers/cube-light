import React, { createContext, forwardRef, useContext } from 'react';

import styles from './header-back-slot.module.css';

/**
 * The nearest top bar's back button slot. On phones a top bar shows whatever its
 * content portals into it; wider screens hide the slot and content shows its own back
 * control instead. Any top bar can host one: the page header, or a full-screen dialog's.
 */
export const HeaderBackSlotContext = createContext<HTMLElement | null>(null);

export function useHeaderBackSlot() {
	return useContext(HeaderBackSlotContext);
}

/** The slot element a top bar places where its back button belongs. */
export const HeaderBackSlot = forwardRef<HTMLDivElement>(
	function HeaderBackSlot(_props, ref) {
		return <div ref={ref} className={styles['slot']} data-back-slot="" />;
	}
);
