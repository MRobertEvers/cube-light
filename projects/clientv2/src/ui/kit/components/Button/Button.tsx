import React from 'react';

import styles from './button.module.css';

type ButtonProps = React.PropsWithChildren<{
	onClick?: (e?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
	style?: any;
	className?: string;
	disabled?: boolean;
	type?: 'button' | 'submit' | 'reset';
	ariaLabel?: string;
	ariaExpanded?: boolean;
	ariaControls?: string;
}>;

export function Button(props: ButtonProps) {
	const {
		onClick,
		children,
		style,
		className,
		disabled,
		type = 'button',
		ariaLabel,
		ariaExpanded,
		ariaControls
	} = props;

	return (
		<button
			type={type}
			aria-label={ariaLabel}
			aria-expanded={ariaExpanded}
			aria-controls={ariaControls}
			disabled={disabled}
			style={style}
			className={styles['default-button'] + ` ${className || ''}`}
			onClick={(e) => onClick?.(e)}
		>
			{children}
		</button>
	);
}
