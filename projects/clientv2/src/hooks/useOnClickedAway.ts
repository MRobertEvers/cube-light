import { MutableRefObject, useEffect, useRef } from 'react';

export function useOnClickedAway(callback: () => void): MutableRefObject<any> {
	const ref = useRef<any>(null);

	useEffect(() => {
		function onClick(event: MouseEvent) {
			if (!ref.current?.contains(event.target)) {
				callback();
				event.stopPropagation();
			}
		}

		window.addEventListener('click', onClick);

		return () => {
			window.removeEventListener('click', onClick);
		};
	}, []);

	return ref;
}
