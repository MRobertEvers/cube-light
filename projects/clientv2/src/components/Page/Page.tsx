import React from 'react';
import { PropsWithChildren } from 'react';
import { Header } from '../Header/Header';
import { PageFrame } from './PageFrame';

type PageProps = PropsWithChildren<{
	header?: React.ReactNode;
}>;

export function Page(props: PageProps) {
	const { header, children } = props;

	return (
		<PageFrame
			renderHeader={(backSlotRef) => (
				<Header backSlotRef={backSlotRef}>{header}</Header>
			)}
		>
			{children}
		</PageFrame>
	);
}
