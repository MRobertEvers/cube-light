/**
 * Keyboard shortcuts for the whole UI, in layers.
 *
 * Every piece of chrome that owns keys gets a layer: the page itself, a header
 * menu, a dialog, a sheet. Layers stack in the order they were created, so a
 * dialog opened from a menu sits above it. A key goes to the layer that holds
 * focus first, then down the stack, and stops at the first modal layer
 * (dialogs and sheets): nothing behind an open dialog hears its keys.
 *
 * Focus is respected in two ways. A focused widget that handles a key itself
 * and calls preventDefault (a suggestion list closing on Escape) wins, since
 * the registry listens after it. And plain typing keys like "/" or "n" never
 * fire while the user is typing in a field; Escape and modified combos
 * (Mod+Enter) still do.
 */

/** page: always there; menu/popover: close on Escape but let keys through; dialog/sheet: modal. */
export type HotkeyLayerKind = 'page' | 'menu' | 'popover' | 'dialog' | 'sheet';

/** What the registry needs from a DOM element; tests pass plain objects. */
export type HotkeyElement = {
	tagName: string;
	isContentEditable?: boolean;
	getAttribute(name: string): string | null;
	/** DOM elements take a Node here; the registry only passes other elements. */
	contains(other: unknown): boolean;
};

/** What the registry needs from a keydown event. */
export type HotkeyEvent = {
	key: string;
	metaKey: boolean;
	ctrlKey: boolean;
	altKey: boolean;
	shiftKey: boolean;
	repeat: boolean;
	isComposing?: boolean;
	defaultPrevented: boolean;
	preventDefault(): void;
};

export type HotkeyTarget = {
	addEventListener(
		type: 'keydown',
		listener: (event: HotkeyEvent) => void
	): void;
	removeEventListener(
		type: 'keydown',
		listener: (event: HotkeyEvent) => void
	): void;
};

export type HotkeyRegistryDeps = {
	target: HotkeyTarget;
	activeElement: () => HotkeyElement | null;
	/** Mod means Meta (⌘) on Apple platforms and Ctrl elsewhere. */
	isApple: boolean;
};

/** Return false to decline the key and let lower bindings have it. */
export type HotkeyHandler = (event: HotkeyEvent) => void | boolean;

export type HotkeyOptions = {
	/**
	 * Fire while a text field has focus. Defaults to true for Escape and for
	 * combos with Mod/Ctrl/Alt, false for plain typing keys.
	 */
	whileTyping?: boolean;
	/** Fire again while the key is held down. */
	allowRepeat?: boolean;
	/** Only fire while focus is inside this element. */
	within?: () => HotkeyElement | null;
};

type Combo = {
	key: string;
	mod: boolean;
	ctrl: boolean;
	alt: boolean;
	shift: boolean | null;
};

type Binding = {
	combo: Combo;
	handler: HotkeyHandler;
	whileTyping: boolean;
	allowRepeat: boolean;
	within: (() => HotkeyElement | null) | null;
	order: number;
};

const MODAL_KINDS: HotkeyLayerKind[] = ['dialog', 'sheet'];
const NON_TEXT_INPUTS = [
	'button',
	'checkbox',
	'color',
	'file',
	'image',
	'radio',
	'range',
	'reset',
	'submit'
];

export class HotkeyLayer {
	readonly kind: HotkeyLayerKind;
	readonly order: number;
	active = false;
	element: (() => HotkeyElement | null) | null = null;
	bindings: Binding[] = [];

	constructor(kind: HotkeyLayerKind, order: number) {
		this.kind = kind;
		this.order = order;
	}

	get modal() {
		return MODAL_KINDS.includes(this.kind);
	}
}

export class HotkeyRegistry {
	readonly page: HotkeyLayer;
	private readonly deps: HotkeyRegistryDeps;
	private layers: HotkeyLayer[] = [];
	private nextOrder = 0;
	private listening = false;

	constructor(deps: HotkeyRegistryDeps) {
		this.deps = deps;
		this.onKeyDown = this.onKeyDown.bind(this);
		this.page = this.createLayer('page');
		this.activate(this.page);
	}

	/**
	 * Makes a layer for a piece of chrome. Create it while rendering so a
	 * parent's layer is always older (lower) than its children's, then
	 * activate it once mounted.
	 */
	createLayer(kind: HotkeyLayerKind) {
		const layer = new HotkeyLayer(kind, this.nextOrder);
		this.nextOrder += 1;
		return layer;
	}

	/** Puts a layer on the stack; `element` is the chrome's root, for focus. */
	activate(layer: HotkeyLayer, element?: () => HotkeyElement | null) {
		layer.element = element ?? null;
		if (layer.active) return;
		layer.active = true;
		this.layers.push(layer);
		this.layers.sort((a, b) => a.order - b.order);
		this.listen();
	}

	deactivate(layer: HotkeyLayer) {
		if (!layer.active || layer === this.page) return;
		layer.active = false;
		this.layers = this.layers.filter((each) => each !== layer);
	}

	/** Binds `combo` (e.g. "Escape", "Mod+Enter", "/") in `layer`; returns the unbind. */
	bind(
		layer: HotkeyLayer,
		combo: string,
		handler: HotkeyHandler,
		options?: HotkeyOptions
	) {
		const {
			whileTyping,
			allowRepeat = false,
			within
		} = options === undefined ? {} : options;
		const parsed = parseCombo(combo);
		const binding: Binding = {
			combo: parsed,
			handler,
			whileTyping: whileTyping ?? typesThrough(parsed),
			allowRepeat,
			within: within ?? null,
			order: this.nextOrder
		};
		this.nextOrder += 1;
		layer.bindings.push(binding);
		return function () {
			layer.bindings = layer.bindings.filter((each) => each !== binding);
		};
	}

	/** The layers a key would reach, in the order they are asked. */
	reachableLayers() {
		const focused = this.deps.activeElement();
		let topModal = 0;
		this.layers.forEach((layer, index) => {
			if (layer.modal) topModal = index;
		});
		const reachable = this.layers.slice(topModal).reverse();
		// The innermost layer holding focus goes first, e.g. a menu opened
		// inside a dialog is asked before the dialog around it.
		const holder = reachable.find((layer) => {
			const element = layer.element?.();
			return Boolean(element && focused && element.contains(focused));
		});
		if (!holder) return reachable;
		return [holder].concat(reachable.filter((layer) => layer !== holder));
	}

	/** Stops listening; the registry is unusable afterwards. */
	dispose() {
		if (this.listening)
			this.deps.target.removeEventListener('keydown', this.onKeyDown);
		this.listening = false;
	}

	private listen() {
		if (this.listening) return;
		this.listening = true;
		this.deps.target.addEventListener('keydown', this.onKeyDown);
	}

	private onKeyDown(event: HotkeyEvent) {
		if (event.defaultPrevented || event.isComposing) return;
		const focused = this.deps.activeElement();
		const typing = isTextEntry(focused);
		for (const layer of this.reachableLayers()) {
			const bindings = layer.bindings
				.slice()
				.sort((a, b) => b.order - a.order);
			for (const binding of bindings) {
				if (!matches(binding.combo, event, this.deps.isApple)) continue;
				if (event.repeat && !binding.allowRepeat) continue;
				if (typing && !binding.whileTyping) continue;
				const within = binding.within?.();
				if (
					binding.within &&
					!(within && focused && within.contains(focused))
				)
					continue;
				if (binding.handler(event) === false) continue;
				event.preventDefault();
				return;
			}
		}
	}
}

function parseCombo(combo: string): Combo {
	const parts = combo.split('+').map((part) => part.trim());
	// "Shift++" or "+" alone means the plus key.
	const key =
		combo.endsWith('++') || combo === '+' ? '+' : parts[parts.length - 1];
	const modifiers = parts
		.slice(0, key === '+' ? -2 : -1)
		.map((part) => part.toLowerCase());
	return {
		key: key.length === 1 ? key.toLowerCase() : key,
		mod: modifiers.includes('mod'),
		ctrl: modifiers.includes('ctrl'),
		alt: modifiers.includes('alt'),
		// Symbols like "?" already imply Shift, so leave it unchecked unless named.
		shift: modifiers.includes('shift')
			? true
			: key.length === 1 && !/[a-z0-9]/i.test(key)
				? null
				: false
	};
}

function typesThrough(combo: Combo) {
	return combo.key === 'Escape' || combo.mod || combo.ctrl || combo.alt;
}

function matches(combo: Combo, event: HotkeyEvent, isApple: boolean) {
	const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
	if (key !== combo.key) return false;
	const wantsMeta = combo.mod && isApple;
	const wantsCtrl = combo.ctrl || (combo.mod && !isApple);
	if (event.metaKey !== wantsMeta) return false;
	if (event.ctrlKey !== wantsCtrl) return false;
	if (event.altKey !== combo.alt) return false;
	if (combo.shift !== null && event.shiftKey !== combo.shift) return false;
	return true;
}

function isTextEntry(element: HotkeyElement | null) {
	if (!element) return false;
	if (element.isContentEditable) return true;
	const tag = element.tagName.toLowerCase();
	if (tag === 'textarea' || tag === 'select') return true;
	if (tag !== 'input') return false;
	const type = (element.getAttribute('type') ?? 'text').toLowerCase();
	return !NON_TEXT_INPUTS.includes(type);
}
