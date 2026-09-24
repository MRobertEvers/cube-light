import React from 'react';
import { PropsWithChildren } from 'react';
import { Header, type HeaderChrome } from '../Header/Header';
import { PageFrame } from './PageFrame';

type PageProps = PropsWithChildren<{
	chrome?: HeaderChrome;
}>;

export function Page(props: PageProps) {
	const { chrome, children } = props;

	return (
		<PageFrame
			renderHeader={(backSlotRef) => (
				<Header backSlotRef={backSlotRef} chrome={chrome} />
			)}
		>
			{children}
		</PageFrame>
	);
}
