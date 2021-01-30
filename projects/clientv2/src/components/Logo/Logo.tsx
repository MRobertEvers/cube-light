import React from 'react';
import logoIcon from 'src/assets/logo.png';

type LogoProps = {
	style?: any;
	className?: string;
};

export function Logo(props: LogoProps) {
	const { style, className } = props;

	return <img style={style} className={` ${className || ''}`} src={logoIcon}></img>;
}
