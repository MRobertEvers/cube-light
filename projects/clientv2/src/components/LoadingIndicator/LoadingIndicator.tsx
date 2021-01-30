import * as React from 'react';
import styles from './loading-indicator.module.css';

type LoadingIndicator = React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>;

export function LoadingIndicator(props: LoadingIndicator) {
	const { className, ...otherProps } = props;
	let classes = styles['loading-indicator'];

	if (className) {
		classes += ` ${className}`;
	}

	return <span {...otherProps} className={classes} />;
}
