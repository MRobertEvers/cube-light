import React from 'react';

import styles from './button.module.css';

/** secondary is the plain outlined button; primary and danger are filled. */
export type ButtonVariant = 'secondary' | 'primary' | 'danger';

type ButtonProps = React.PropsWithChildren<{
	variant?: ButtonVariant;
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
		ariaControls,
		variant = 'secondary'
	} = props;
	const variantClass = variant === 'secondary' ? '' : ` ${styles[variant]}`;

	return (
		<button
			type={type}
			aria-label={ariaLabel}
			aria-expanded={ariaExpanded}
			aria-controls={ariaControls}
			disabled={disabled}
			style={style}
			className={
				styles['default-button'] + variantClass + ` ${className || ''}`
			}
			onClick={(e) => onClick?.(e)}
		>
			{children}
		</button>
	);
}
