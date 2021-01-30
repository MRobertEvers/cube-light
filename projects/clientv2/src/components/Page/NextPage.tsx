import React from 'react';
// import Head from 'next/head';
import { useEffect } from 'react';

export function NextPage(
	props: React.PropsWithChildren<{
		title?: string;
	}>
) {
	const { children, title } = props;
	useEffect(() => {
		document.title = title || 'MtG Drachen';
	}, []);
	return <>{children}</>;
}
