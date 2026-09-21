import React from 'react';
import logoIcon from 'src/assets/logo-icon.png';
import styles from './logo-inkwell-pulse.module.css';

export type LogoInkwellPulseProps = {
	active?: boolean;
	size?: number;
	className?: string;
	style?: React.CSSProperties;
};

export function LogoInkwellPulse({ active = true, size = 32, className, style }: LogoInkwellPulseProps) {
	const classes = [styles.root, active ? styles.active : styles.idle, className].filter(Boolean).join(' ');
	return <span
		className={classes}
		style={{ '--inkwell-size': `${size}px`, ...style } as React.CSSProperties}
		aria-hidden="true"
	>
		<span className={styles.pulse} data-inkwell-pulse="primary" />
		<span className={`${styles.pulse} ${styles.delayed}`} data-inkwell-pulse="delayed" />
		<span className={styles.splotch} />
		<span className={styles.well}>
			<img className={styles.logo} src={logoIcon} alt="" />
		</span>
	</span>;
}
