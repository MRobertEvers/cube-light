import React from 'react';

import styles from './button.module.css';

type ButtonProps = React.PropsWithChildren<{
	onClick?: (e?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
	style?: any;
	className?: string;
	disabled?: boolean;
}>;

export function Button(props: ButtonProps) {
	const { onClick, children, style, className, disabled } = props;

	return (
		<button
			disabled={disabled}
			style={style}
			className={styles['default-button'] + ` ${className || ''}`}
			onClick={(e) => onClick?.(e)}
		>
			{children}
		</button>
	);
}
