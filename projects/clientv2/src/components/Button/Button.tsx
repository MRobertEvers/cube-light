import React from 'react';

import styles from './button.module.css';

type ButtonProps = React.PropsWithChildren<{
	onClick?: (e?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
	style?: any;
	className?: string;
	disabled?: boolean;
	type?: 'button' | 'submit' | 'reset';
	ariaLabel?: string;
}>;

export function Button(props: ButtonProps) {
	const { onClick, children, style, className, disabled, type = 'button', ariaLabel } = props;

	return (
		<button
			type={type}
			aria-label={ariaLabel}
			disabled={disabled}
			style={style}
			className={styles['default-button'] + ` ${className || ''}`}
			onClick={(e) => onClick?.(e)}
		>
			{children}
		</button>
	);
}
