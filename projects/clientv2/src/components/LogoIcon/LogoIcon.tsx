import React from 'react';
import logoIcon from 'src/assets/logo-icon.png';

type LogoIconProps = {
	style?: any;
	className?: string;
};

export function LogoIcon(props: LogoIconProps) {
	const { style, className } = props;

	return <img style={style} className={` ${className || ''}`} src={logoIcon}></img>;
}
