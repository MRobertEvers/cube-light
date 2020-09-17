import type { AppProps } from 'next/app';
import { register } from '../service-worker/service-worker';
import '../assets/common.css';

register();

export default function ApplicationContainer({ Component, pageProps }: AppProps) {
	return <Component {...pageProps} />;
}
