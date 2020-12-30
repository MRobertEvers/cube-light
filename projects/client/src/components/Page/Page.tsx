import { PropsWithChildren } from 'react';
import { Header } from '../Header/Header';

type PageProps = PropsWithChildren<{}>;

export function Page(props: PageProps) {
	const { children } = props;

	return (
		<>
			<Header />
			{children}
		</>
	);
}
