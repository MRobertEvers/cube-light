import React, { useRef, useState } from 'react';
import { type CardFrame, cardFrame } from '../../../../domain/models/card-frame';
import type { DeckColor } from '../../../../domain/deck/deck-colors';
import { ManaCost, ManaText } from '../ManaCost/ManaCost';
import { SetSymbol } from './SetSymbol';
import { useShrinkToFit } from './use-shrink-to-fit';

import acard from '../../../../assets/card-frames/acard.webp?url';
import apt from '../../../../assets/card-frames/apt.webp?url';
import bcard from '../../../../assets/card-frames/bcard.webp?url';
import blcard from '../../../../assets/card-frames/blcard.webp?url';
import bpt from '../../../../assets/card-frames/bpt.webp?url';
import ccard from '../../../../assets/card-frames/ccard.webp?url';
import clcard from '../../../../assets/card-frames/clcard.webp?url';
import cpt from '../../../../assets/card-frames/cpt.webp?url';
import gcard from '../../../../assets/card-frames/gcard.webp?url';
import glcard from '../../../../assets/card-frames/glcard.webp?url';
import gpt from '../../../../assets/card-frames/gpt.webp?url';
import mcard from '../../../../assets/card-frames/mcard.webp?url';
import mlcard from '../../../../assets/card-frames/mlcard.webp?url';
import mpt from '../../../../assets/card-frames/mpt.webp?url';
import rcard from '../../../../assets/card-frames/rcard.webp?url';
import rlcard from '../../../../assets/card-frames/rlcard.webp?url';
import rpt from '../../../../assets/card-frames/rpt.webp?url';
import ucard from '../../../../assets/card-frames/ucard.webp?url';
import ulcard from '../../../../assets/card-frames/ulcard.webp?url';
import upt from '../../../../assets/card-frames/upt.webp?url';
import wcard from '../../../../assets/card-frames/wcard.webp?url';
import wlcard from '../../../../assets/card-frames/wlcard.webp?url';
import wpt from '../../../../assets/card-frames/wpt.webp?url';

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

/** A frame and power/toughness box image; a second frame blends over the right half for two-color frames. */
type FrameImages = { frame: string; right: string | null; pt: string };

const MONO_FRAMES: Record<DeckColor, string> = { W: wcard, U: ucard, B: bcard, R: rcard, G: gcard };
const LAND_FRAMES: Record<DeckColor, string> = { W: wlcard, U: ulcard, B: blcard, R: rlcard, G: glcard };
const PT_BOXES: Record<DeckColor, string> = { W: wpt, U: upt, B: bpt, R: rpt, G: gpt };

/** The M15 frame images for a frame: one color, a split of two, gold, artifact, colorless or land. */
function frameImages(frame: CardFrame): FrameImages {
	if (frame.kind === 'mono') return { frame: MONO_FRAMES[frame.color], right: null, pt: PT_BOXES[frame.color] };
	if (frame.kind === 'hybrid') return { frame: MONO_FRAMES[frame.colors[0]], right: MONO_FRAMES[frame.colors[1]], pt: PT_BOXES[frame.colors[1]] };
	if (frame.kind === 'gold') return { frame: mcard, right: null, pt: mpt };
	if (frame.kind === 'artifact') return { frame: acard, right: null, pt: apt };
	if (frame.kind === 'colorless') return { frame: ccard, right: null, pt: cpt };
	if (frame.colors.length === 0) return { frame: clcard, right: null, pt: cpt };
	if (frame.colors.length === 1) return { frame: LAND_FRAMES[frame.colors[0]], right: null, pt: cpt };
	if (frame.colors.length === 2) return { frame: LAND_FRAMES[frame.colors[0]], right: LAND_FRAMES[frame.colors[1]], pt: cpt };
	return { frame: mlcard, right: null, pt: cpt };
}

/** Power and toughness, or loyalty, or defense; null for cards with none. */
function stats(face: RenderedCardFace): string | null {
	if (face.power != null && face.toughness != null) return `${face.power}/${face.toughness}`;
	return face.loyalty ?? face.defense;
}

const RARITY_LETTERS: Record<string, string> = { common: 'C', uncommon: 'U', rare: 'R', mythic: 'M', special: 'S', bonus: 'B' };

/**
 * A card drawn from its text, for when its image cannot be shown: the M15 frame for its
 * colors (assets/card-frames) with its art in the frame's window, name, cost, type line,
 * set symbol, rules text and stats laid where a printed card has them. The frames, art and
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
	const images = frameImages(frame);
	const cardStats = stats(face);
	const art = face.art && face.art !== failedArt ? face.art : null;
	const rarity = face.rarity ? RARITY_LETTERS[face.rarity.toLowerCase()] ?? null : null;

	return (
		<article className={`${styles['card']} ${className ?? ''}`} data-frame={frame.kind} aria-label={face.name}>
			<img className={styles['frame']} src={images.frame} alt="" draggable={false} />
			{images.right && <img className={`${styles['frame']} ${styles['right']}`} src={images.right} alt="" draggable={false} />}
			<div className={styles['art']}>
				{art && (
					<img
						src={art}
						alt=""
						draggable={false}
						onError={function () {
							setFailedArt(art);
						}}
					/>
				)}
			</div>
			<div className={styles['title']}>
				<span ref={name} className={styles['name']}>
					{face.name}
				</span>
				{face.manaCost && (
					<span className={styles['cost']}>
						<ManaCost cost={face.manaCost} />
					</span>
				)}
			</div>
			<div className={styles['type-line']}>
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
			{cardStats && (
				<>
					<img className={styles['pt-box']} src={images.pt} alt="" draggable={false} />
					<div className={styles['stats']}>{cardStats}</div>
				</>
			)}
			<footer className={styles['footer']}>
				<span>{[face.number, rarity].filter(Boolean).join(' ')}</span>
				<span>
					{face.setCode}
					{face.artist && <span className={styles['artist']}> · Illus. {face.artist}</span>}
				</span>
			</footer>
		</article>
	);
}
