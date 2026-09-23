import React from 'react';
import styles from './spinner.module.css';

export function Spinner() {
	return <span className={styles['loading-indicator']} />;
}
