import type { AppProps } from 'next/app';
import '../assets/common.css';

export default function ApplicationContainer({ Component, pageProps }: AppProps) {
	return <Component {...pageProps} />;
}
