import * as React from 'react';
import { LogoIcon } from '../LogoIcon/LogoIcon';
import styles from './loading-indicator.module.css';

type LoadingIndicator = React.DetailedHTMLProps<
	React.HTMLAttributes<HTMLDivElement>,
	HTMLDivElement
>;

export function LoadingIndicator(props: LoadingIndicator) {
	const { className, style } = props;
	let classes = styles['loading-indicator'];

	if (className) {
		classes += ` ${className}`;
	}

	return (
		<div className={styles['loading-indicator-container']}>
			<LogoIcon style={style} className={classes} />
		</div>
	);
}
