import { before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CardListLintWasm } from '../src/platform/wasm/card-list-lint-wasm';
import { locateCardName } from '../src/domain/card-names/parse-card-list';

/** The server's NMI1 layout: magic, count, byte length, offsets, sorted NUL-terminated names. */
function nameIndex(names: string[]): Uint8Array {
	const encoder = new TextEncoder();
	const encoded = Array.from(new Set(names))
		.map((name) => encoder.encode(name))
		.sort((a, b) => Buffer.compare(a, b));
	const dataSize = encoded.reduce((size, name) => size + name.length + 1, 0);
	const blob = new Uint8Array(12 + encoded.length * 4 + dataSize);
	const view = new DataView(blob.buffer);
	blob.set(encoder.encode('NMI1'));
	view.setUint32(4, encoded.length, true);
	view.setUint32(8, dataSize, true);
	let offset = 0;
	encoded.forEach((name, index) => {
		view.setUint32(12 + index * 4, offset, true);
		blob.set(name, 12 + encoded.length * 4 + offset);
		offset += name.length + 1;
	});
	return blob;
}

// Created once; tests await it rather than using top-level await, which tsx's CJS output rejects.
const ready = CardListLintWasm.create(
	readFileSync(new URL('../src/platform/wasm/card-list-lint.wasm', import.meta.url)),
	nameIndex([
		'Lightning Bolt',
		'Lightning Colt',
		'Lightning Helix',
		'Emeritus of Conflict // Lightning Bolt',
		'Counterspell',
		'Sol Ring',
		'Sol Ring // Sol Ring',
		'Opt',
		'Fire // Ice',
		'Jace, the Mind Sculptor',
		'Lim-Dûl the Necromancer',
		'Æther Vial',
		'Snapcaster Mage',
		'Sparkcaster',
		"Urza's Saga",
		'Brazen Borrower // Petty Theft'
	])
);
let lint: CardListLintWasm;
before(async () => {
	lint = await ready;
});
function suggest(name: string) {
	return lint.suggest(name).map((options) => {
		const { name } = options;
		return name;
	});
}

test('finds names the way the server does: exact and ASCII case-insensitive', () => {
	assert.equal(lint.count, 16);
	assert.equal(lint.find('lightning bolt'), 'Lightning Bolt');
	assert.equal(lint.find('  SOL RING '), 'Sol Ring');
	assert.equal(
		lint.find('Lim-Dûl the Necromancer'),
		'Lim-Dûl the Necromancer'
	);
	// The server rejects faces, missing punctuation and unaccented spellings.
	assert.equal(lint.find('Fire'), null);
	assert.equal(lint.find('Fire//Ice'), null);
	assert.equal(lint.find('Jace the Mind Sculptor'), null);
	assert.equal(lint.find('Lim-Dul the Necromancer'), null);
	assert.equal(lint.find(''), null);
});

test('suggests close names for typos, transpositions and truncations', () => {
	assert.equal(suggest('lightnin bolt')[0], 'Lightning Bolt');
	assert.equal(suggest('ligthning bolt')[0], 'Lightning Bolt');
	assert.equal(suggest('Counterspel')[0], 'Counterspell');
	assert.equal(suggest('ligntng bol')[0], 'Lightning Bolt');
	assert.equal(suggest('lighning')[0], 'Lightning Bolt');
	assert.equal(suggest('litning bolt')[0], 'Lightning Bolt');
	assert.equal(suggest('lightning hel')[0], 'Lightning Helix');
	assert.equal(suggest('otp')[0], 'Opt');
	assert.equal(suggest('Snapcaster')[0], 'Snapcaster Mage');
	assert.equal(suggest('urza saga')[0], "Urza's Saga");
	assert.deepEqual(suggest('xyzzy'), []);
});

test('suggests through folded punctuation, accents and card faces', () => {
	assert.equal(suggest('Fire//Ice')[0], 'Fire // Ice');
	assert.equal(suggest('fire')[0], 'Fire // Ice');
	assert.equal(
		suggest('Brazen Borrower')[0],
		'Brazen Borrower // Petty Theft'
	);
	assert.equal(
		suggest('jace the mind sculptor')[0],
		'Jace, the Mind Sculptor'
	);
	assert.equal(
		suggest('lim dul the necromancer')[0],
		'Lim-Dûl the Necromancer'
	);
	assert.equal(suggest('aether vial')[0], 'Æther Vial');
	assert.deepEqual(lint.suggest('fire')[0], {
		name: 'Fire // Ice',
		distance: 0
	});
});

test('drops face matches that repeat a better result', () => {
	assert.deepEqual(suggest('sol rng'), ['Sol Ring']);
	assert.ok(
		!suggest('lightnin bolt').includes(
			'Emeritus of Conflict // Lightning Bolt'
		)
	);
});

test('completes by word prefixes, best first', () => {
	assert.deepEqual(lint.complete('light bo'), [
		'Lightning Bolt',
		'Emeritus of Conflict // Lightning Bolt'
	]);
	assert.equal(lint.complete('LIGHTN')[0], 'Lightning Bolt');
	assert.deepEqual(lint.complete('bolt'), [
		'Lightning Bolt',
		'Emeritus of Conflict // Lightning Bolt'
	]);
	assert.deepEqual(lint.complete('jace th'), ['Jace, the Mind Sculptor']);
	assert.deepEqual(lint.complete('ice'), ['Fire // Ice']);
	assert.equal(lint.complete('light', 2).length, 2);
	assert.deepEqual(lint.complete('zz'), []);
	assert.deepEqual(lint.complete(''), []);
});

test('rejects a malformed name index', async function () {
	await assert.rejects(
		CardListLintWasm.create(
			readFileSync(
				new URL('../src/platform/wasm/card-list-lint.wasm', import.meta.url)
			),
			new TextEncoder().encode('not an index')
		),
		/invalid/
	);
});

test('locates the card name within a line', () => {
	function span(line: string) {
		const found = locateCardName(line);
		return found && line.slice(found.start, found.end);
	}
	assert.equal(span('4 lightning bolt'), 'lightning bolt');
	assert.equal(span('  2x Counterspell (MH2) 267'), 'Counterspell');
	assert.equal(span('SB: 1 Duress'), 'Duress');
	assert.equal(span('Fire // Ice *F*'), 'Fire // Ice');
	assert.equal(span('10x   Island'), 'Island');
	assert.equal(locateCardName('10x   Island')?.name, 'Island');
	assert.equal(locateCardName('Sideboard'), null);
	assert.equal(locateCardName('// comment'), null);
	assert.equal(locateCardName('   '), null);
});

test('locates the count and printing around a card name', () => {
	function parts(line: string) {
		const found = locateCardName(line)!;
		function slice(span: { start: number; end: number } | null) {
			return span && line.slice(span.start, span.end);
		}
		return {
			count: slice(found.count),
			printing: slice(found.printing),
			setCode: found.printing?.setCode ?? null
		};
	}
	assert.deepEqual(parts('4 Lightning Bolt'), {
		count: '4',
		printing: null,
		setCode: null
	});
	assert.deepEqual(parts('  12x Counterspell (mh2) 267'), {
		count: '12',
		printing: '(mh2) 267',
		setCode: 'MH2'
	});
	assert.deepEqual(parts('SB: Duress (M19) *F*'), {
		count: null,
		printing: '(M19)',
		setCode: 'M19'
	});
	assert.deepEqual(parts('Sol Ring'), {
		count: null,
		printing: null,
		setCode: null
	});
});
