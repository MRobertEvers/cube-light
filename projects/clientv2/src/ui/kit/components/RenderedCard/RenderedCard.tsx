import React, { type CSSProperties, useRef, useState } from 'react';
import { type CardFrame, cardFrame } from '../../../../domain/models/card-frame';
import type { DeckColor } from '../../../../domain/deck/deck-colors';
import { ManaCost, ManaText } from '../ManaCost/ManaCost';
import { SetSymbol } from './SetSymbol';
import { useShrinkToFit } from './use-shrink-to-fit';

import styles from './rendered-card.module.css';

/** What a rendered card shows: one face's text, its printing's details and its art's URL. */
export type RenderedCardFace = {
	name: string;
	manaCost: string | null;
	type: string | null;
	text: string | null;
	flavorText: string | null;
	power: string | null;
	toughness: string | null;
	loyalty: string | null;
	defense: string | null;
	setCode: string | null;
	rarity: string | null;
	number: string | null;
	artist: string | null;
	/** The art crop's URL; null when the printing has none known here. */
	art: string | null;
};

/** One side of a frame's colors: the frame itself, the name and type bars, the text box. */
type Paint = { frame: string; bar: string; box: string };
type PaintName = DeckColor | 'gold' | 'artifact' | 'colorless' | 'land';

const PAINTS: Record<PaintName, Paint> = {
	W: { frame: '#e4dcc4', bar: '#f6f1e2', box: '#f8f5ec' },
	U: { frame: '#1768a8', bar: '#c3dcee', box: '#dde9f1' },
	B: { frame: '#2e2927', bar: '#cfc7c2', box: '#e0dad6' },
	R: { frame: '#c9352a', bar: '#f2c9b1', box: '#f5e0d4' },
	G: { frame: '#1f6f43', bar: '#c8dbc1', box: '#dee8d8' },
	gold: { frame: '#c7a24c', bar: '#efe0ad', box: '#f3eacb' },
	artifact: { frame: '#8795a0', bar: '#d6dde2', box: '#e5eaed' },
	colorless: { frame: '#bdb8b3', bar: '#e6e3e0', box: '#efedeb' },
	land: { frame: '#86705a', bar: '#ddd0bf', box: '#ebe3d8' }
};

/** The two sides of the frame, the bars and the text box; one-color frames paint both sides alike. */
type FramePaint = { frame: [Paint, Paint]; inner: [Paint, Paint] };

function colorsPaint(colors: DeckColor[], none: PaintName): [Paint, Paint] {
	if (colors.length === 0) return [PAINTS[none], PAINTS[none]];
	if (colors.length === 1) return [PAINTS[colors[0]], PAINTS[colors[0]]];
	if (colors.length === 2) return [PAINTS[colors[0]], PAINTS[colors[1]]];
	return [PAINTS.gold, PAINTS.gold];
}

function framePaint(frame: CardFrame): FramePaint {
	if (frame.kind === 'mono') return { frame: [PAINTS[frame.color], PAINTS[frame.color]], inner: [PAINTS[frame.color], PAINTS[frame.color]] };
	if (frame.kind === 'hybrid') return { frame: [PAINTS[frame.colors[0]], PAINTS[frame.colors[1]]], inner: [PAINTS[frame.colors[0]], PAINTS[frame.colors[1]]] };
	if (frame.kind === 'gold') return { frame: [PAINTS.gold, PAINTS.gold], inner: [PAINTS.gold, PAINTS.gold] };
	if (frame.kind === 'land') return { frame: [PAINTS.land, PAINTS.land], inner: colorsPaint(frame.colors, 'land') };
	return { frame: [PAINTS[frame.kind], PAINTS[frame.kind]], inner: [PAINTS[frame.kind], PAINTS[frame.kind]] };
}

function paintStyle(paint: FramePaint): CSSProperties {
	return {
		'--frame-a': paint.frame[0].frame,
		'--frame-b': paint.frame[1].frame,
		'--bar-a': paint.inner[0].bar,
		'--bar-b': paint.inner[1].bar,
		'--box-a': paint.inner[0].box,
		'--box-b': paint.inner[1].box
	} as CSSProperties;
}

/** Power and toughness, or loyalty, or defense; null for cards with none. */
function stats(face: RenderedCardFace): string | null {
	if (face.power != null && face.toughness != null) return `${face.power}/${face.toughness}`;
	return face.loyalty ?? face.defense;
}

const RARITY_LETTERS: Record<string, string> = { common: 'C', uncommon: 'U', rare: 'R', mythic: 'M', special: 'S', bonus: 'B' };

/**
 * A card drawn from its text, for when its image cannot be shown: a frame in its colors
 * around its art, name, cost, type line, set symbol, rules text and stats. The art and
 * fonts come through ShellWorker like any asset, so it draws offline once they are stored.
 */
export function RenderedCard(props: { face: RenderedCardFace; className?: string }) {
	const { face, className } = props;
	const [failedArt, setFailedArt] = useState<string | null>(null);
	const name = useRef<HTMLSpanElement>(null);
	const type = useRef<HTMLSpanElement>(null);
	const box = useRef<HTMLDivElement>(null);
	const text = `${face.text ?? ''}\n${face.flavorText ?? ''}`;
	useShrinkToFit(name, face.name, 'width', 0.6);
	useShrinkToFit(type, face.type ?? '', 'width', 0.6);
	useShrinkToFit(box, text, 'height', 0.5);

	const frame = cardFrame({ manaCost: face.manaCost, type: face.type, text: face.text });
	const cardStats = stats(face);
	const art = face.art && face.art !== failedArt ? face.art : null;
	const rarity = face.rarity ? RARITY_LETTERS[face.rarity.toLowerCase()] ?? null : null;
	const footer = [face.number, face.setCode, rarity].filter(Boolean).join(' · ');

	return (
		<article className={`${styles['card']} ${className ?? ''}`} style={paintStyle(framePaint(frame))} data-frame={frame.kind} aria-label={face.name}>
			<div className={styles['frame']}>
				<div className={styles['bar']}>
					<span ref={name} className={styles['name']}>
						{face.name}
					</span>
					{face.manaCost && (
						<span className={styles['cost']}>
							<ManaCost cost={face.manaCost} />
						</span>
					)}
				</div>
				<div className={styles['art']}>
					{art && (
						<img
							src={art}
							alt=""
							onError={function () {
								setFailedArt(art);
							}}
						/>
					)}
				</div>
				<div className={styles['bar']}>
					<span ref={type} className={styles['type']}>
						{face.type}
					</span>
					{face.setCode && <SetSymbol setCode={face.setCode} rarity={face.rarity} />}
				</div>
				<div ref={box} className={styles['box']}>
					{face.text?.split('\n').map((line, i) => (
						<p key={i}>
							<ManaText text={line} />
						</p>
					))}
					{face.flavorText && <p className={styles['flavor']}>{face.flavorText}</p>}
				</div>
				{cardStats && <div className={styles['stats']}>{cardStats}</div>}
			</div>
			<footer className={styles['footer']}>
				<span>{footer}</span>
				{face.artist && <span className={styles['artist']}>Illus. {face.artist}</span>}
			</footer>
		</article>
	);
}
