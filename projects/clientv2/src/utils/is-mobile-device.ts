/** Phones and tablets: touch-first devices without hover, where heavy image work is slow. */
export function isMobileDevice(): boolean {
	const agentData = (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData;
	if (agentData?.mobile) return true;
	return typeof window.matchMedia === 'function' && window.matchMedia('(hover: none) and (pointer: coarse)').matches;
}
