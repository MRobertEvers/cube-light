import Head from 'next/head';
import { Header } from '../Header/Header';

export function Page(
	props: React.PropsWithChildren<{
		title?: string;
	}>
) {
	const { children, title } = props;
	const displayTitle = title || 'My App';
	return (
		<div>
			<Head>
				<title>{displayTitle}</title>
			</Head>
			<Header />
			{children}
		</div>
	);
}
