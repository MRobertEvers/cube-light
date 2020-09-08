import { Header } from '../Header/Header';

export function Page(props: React.PropsWithChildren<{}>) {
	const { children } = props;

	return (
		<div>
			<Header />
			{children}
		</div>
	);
}
