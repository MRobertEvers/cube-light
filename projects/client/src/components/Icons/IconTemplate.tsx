export type IconProps = React.DetailedHTMLProps<
	React.HTMLAttributes<HTMLSpanElement>,
	HTMLSpanElement
>;

function IconTemplate(svg: string) {
	return (props: IconProps) => (
		<span
			className={props.className}
			dangerouslySetInnerHTML={{ __html: svg }}
		/>
	);
}

export default IconTemplate;
