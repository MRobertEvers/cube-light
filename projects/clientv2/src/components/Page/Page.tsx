import React from 'react';
import { PropsWithChildren } from 'react';
import { Header } from '../Header/Header';

type PageProps = PropsWithChildren<{
	header?: React.ReactNode;
}>;

export function Page(props: PageProps) {
	const { header, children } = props;

	return (
		<>
			<Header>{header}</Header>
			{children}
		</>
	);
}
