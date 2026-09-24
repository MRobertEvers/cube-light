import styles from './mana-cost.module.css';

const MANA_SYMBOL_FILES: Record<string, string> = {
	'{T}': 'T.svg',
	'{Q}': 'Q.svg',
	'{E}': 'E.svg',
	'{P}': 'P.svg',
	'{PW}': 'PW.svg',
	'{CHAOS}': 'CHAOS.svg',
	'{A}': 'A.svg',
	'{TK}': 'TK.svg',
	'{X}': 'X.svg',
	'{Y}': 'Y.svg',
	'{Z}': 'Z.svg',
	'{0}': '0.svg',
	'{½}': 'HALF.svg',
	'{1}': '1.svg',
	'{2}': '2.svg',
	'{3}': '3.svg',
	'{4}': '4.svg',
	'{5}': '5.svg',
	'{6}': '6.svg',
	'{7}': '7.svg',
	'{8}': '8.svg',
	'{9}': '9.svg',
	'{10}': '10.svg',
	'{11}': '11.svg',
	'{12}': '12.svg',
	'{13}': '13.svg',
	'{14}': '14.svg',
	'{15}': '15.svg',
	'{16}': '16.svg',
	'{17}': '17.svg',
	'{18}': '18.svg',
	'{19}': '19.svg',
	'{20}': '20.svg',
	'{100}': '100.svg',
	'{1000000}': '1000000.svg',
	'{∞}': 'INFINITY.svg',
	'{W/U}': 'WU.svg',
	'{W/B}': 'WB.svg',
	'{B/R}': 'BR.svg',
	'{B/G}': 'BG.svg',
	'{U/B}': 'UB.svg',
	'{U/R}': 'UR.svg',
	'{R/G}': 'RG.svg',
	'{R/W}': 'RW.svg',
	'{G/W}': 'GW.svg',
	'{G/U}': 'GU.svg',
	'{B/G/P}': 'BGP.svg',
	'{B/R/P}': 'BRP.svg',
	'{G/U/P}': 'GUP.svg',
	'{G/W/P}': 'GWP.svg',
	'{R/G/P}': 'RGP.svg',
	'{R/W/P}': 'RWP.svg',
	'{U/B/P}': 'UBP.svg',
	'{U/R/P}': 'URP.svg',
	'{W/B/P}': 'WBP.svg',
	'{W/U/P}': 'WUP.svg',
	'{C/W}': 'CW.svg',
	'{C/U}': 'CU.svg',
	'{C/B}': 'CB.svg',
	'{C/R}': 'CR.svg',
	'{C/G}': 'CG.svg',
	'{2/W}': '2W.svg',
	'{2/U}': '2U.svg',
	'{2/B}': '2B.svg',
	'{2/R}': '2R.svg',
	'{2/G}': '2G.svg',
	'{H}': 'H.svg',
	'{W/P}': 'WP.svg',
	'{U/P}': 'UP.svg',
	'{B/P}': 'BP.svg',
	'{R/P}': 'RP.svg',
	'{G/P}': 'GP.svg',
	'{C/P}': 'CP.svg',
	'{HW}': 'HW.svg',
	'{HR}': 'HR.svg',
	'{W}': 'W.svg',
	'{U}': 'U.svg',
	'{B}': 'B.svg',
	'{R}': 'R.svg',
	'{G}': 'G.svg',
	'{C}': 'C.svg',
	'{S}': 'S.svg',
	'{L}': 'L.svg',
	'{D}': 'D.svg'
};

/**
 * A symbol's URL. The build fingerprints every file this pattern can reach, so symbols
 * are served under /assets/ with an immutable cache header and fetched only once; in
 * development only the symbols on screen are requested.
 */
function symbolUrl(symbol: string) {
	const filename = MANA_SYMBOL_FILES[symbol];
	if (!filename) return null;
	return new URL(`../../../../assets/mana-symbols/${filename}`, import.meta.url)
		.href;
}

type SymbolTextProps = {
	text: string;
	symbolClassName: string;
	unknownClassName: string;
	hideSymbols: boolean;
};

function SymbolText(props: SymbolTextProps) {
	const { text, symbolClassName, unknownClassName, hideSymbols } = props;
	return (
		<>
			{text.split(/(\{[^}]+\})/).map((part, index) => {
				const source = symbolUrl(part);
				if (source) {
					return (
						<img
							key={`${part}-${index}`}
							className={symbolClassName}
							src={source}
							alt={hideSymbols ? '' : part}
							title={part}
							aria-hidden={hideSymbols || undefined}
						/>
					);
				}

				const symbol = /^\{([^}]+)\}$/.exec(part)?.[1];
				if (!symbol) return part;
				return (
					<abbr
						key={`${part}-${index}`}
						className={unknownClassName}
						title={part}
						aria-hidden={hideSymbols || undefined}
					>
						{symbol}
					</abbr>
				);
			})}
		</>
	);
}

/** `label` names the symbols for screen readers; it defaults to "Mana cost: <cost>". */
export function ManaCost(props: { cost: string; label?: string }) {
	const { cost, label } = props;
	if (!cost) return null;

	return (
		<span className={styles.manaCost} aria-label={label ?? `Mana cost: ${cost}`}>
			<SymbolText
				text={cost}
				symbolClassName={styles.manaSymbol}
				unknownClassName={styles.unknownSymbol}
				hideSymbols
			/>
		</span>
	);
}

export function ManaText(props: { text: string }) {
	const { text } = props;
	return (
		<SymbolText
			text={text}
			symbolClassName={styles.inlineSymbol}
			unknownClassName={styles.inlineUnknownSymbol}
			hideSymbols={false}
		/>
	);
}
