import React from 'react';
import styles from './mtg-arena-table-board.module.css';

const EXAMPLES: [string, string][] = [
	['squirrel', 'Names containing “squirrel”'],
	['t:creature', 'Type line contains “creature” (t!= to exclude)'],
	['o:"draw a card"', 'Rules text contains the phrase'],
	['mv<=2', 'Mana value 2 or less (also cmc; = != < > <= >=)'],
	['c:g', 'Green cards; c=g only mono-green; c:m multicolor; c:c colorless'],
	['id:bg', 'Color identity within black and green, counting rules text'],
	['r>=rare', 'Rare or mythic (c, u, r, m)'],
	['pow>=3 tou<3', 'Power and toughness; loy for loyalty'],
	['q>=4', 'Four or more copies in the deck'],
	['s:dsk', 'Set code (also e:)'],
	['m:gg', 'Mana cost contains GG'],
	['?spell', 'Nonland cards; also ?permanent, ?basicland'],
	['t:land or c:g', 'Either; side-by-side terms must both match'],
	['-(t:land)', 'Negate a term or a group']
];

/** A short reference for the MTG Arena search syntax the table accepts. */
export function ArenaSearchHelp() {
	return (
		<details className={styles.help}>
			<summary>Search syntax</summary>
			<dl>
				{EXAMPLES.map((example) => (
					<div key={example[0]}>
						<dt>
							<code>{example[0]}</code>
						</dt>
						<dd>{example[1]}</dd>
					</div>
				))}
			</dl>
		</details>
	);
}
