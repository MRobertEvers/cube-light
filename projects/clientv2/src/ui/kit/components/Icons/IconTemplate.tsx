import React from 'react';
export type IconProps = React.DetailedHTMLProps<
	React.HTMLAttributes<HTMLSpanElement>,
	HTMLSpanElement
>;

export function IconTemplate(svg: string) {
	return function (props: IconProps) {
		return <span {...props} dangerouslySetInnerHTML={{ __html: svg }} />;
	};
}
