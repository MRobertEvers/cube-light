import React, {
	createContext,
	useContext,
	useEffect,
	useLayoutEffect,
	useRef,
	useState
} from 'react';
import type {
	HotkeyEvent,
	HotkeyLayer,
	HotkeyLayerKind,
	HotkeyRegistry
} from './hotkey-registry';

const RegistryContext = createContext<HotkeyRegistry | null>(null);
const LayerContext = createContext<HotkeyLayer | null>(null);

export type HotkeysProviderProps = React.PropsWithChildren<{
	registry: HotkeyRegistry;
}>;

/** Makes `registry` the one the hooks below register with; its page layer is the default. */
export function HotkeysProvider(props: HotkeysProviderProps) {
	const { registry, children } = props;
	return (
		<RegistryContext.Provider value={registry}>
			<LayerContext.Provider value={registry.page}>
				{children}
			</LayerContext.Provider>
		</RegistryContext.Provider>
	);
}

function useRegistry() {
	const registry = useContext(RegistryContext);
	if (!registry)
		throw new Error('useHotkey needs a HotkeysProvider above it.');
	return registry;
}

export type HotkeyLayerOptions = {
	/** The chrome's root element, so focus inside it reaches this layer first. */
	elementRef?: React.RefObject<HTMLElement | null>;
	/** Off leaves the layer off the stack, e.g. while a menu is closed. */
	enabled?: boolean;
};

/**
 * Gives a piece of chrome (dialog, sheet, menu) its own layer. Wrap its
 * contents in <HotkeyScope layer={layer}> so hotkeys inside register there.
 */
export function useHotkeyLayer(
	kind: HotkeyLayerKind,
	options?: HotkeyLayerOptions
) {
	const { elementRef, enabled = true } = options === undefined ? {} : options;
	const registry = useRegistry();
	// Created while rendering, so a parent's layer is always below its children's.
	const [layer] = useState(() => registry.createLayer(kind));
	useLayoutEffect(() => {
		if (!enabled) return;
		registry.activate(layer, () => elementRef?.current ?? null);
		return function () {
			registry.deactivate(layer);
		};
	}, [registry, layer, elementRef, enabled]);
	return layer;
}

export type HotkeyScopeProps = React.PropsWithChildren<{ layer: HotkeyLayer }>;

/** Hotkeys registered by `children` go into `layer`. */
export function HotkeyScope(props: HotkeyScopeProps) {
	const { layer, children } = props;
	return (
		<LayerContext.Provider value={layer}>{children}</LayerContext.Provider>
	);
}

export type UseHotkeyOptions = {
	enabled?: boolean;
	/** Register here instead of the nearest scope (a dialog binding its own Escape). */
	layer?: HotkeyLayer;
	whileTyping?: boolean;
	allowRepeat?: boolean;
	/** Only while focus is inside this element. */
	withinRef?: React.RefObject<HTMLElement | null>;
};

/**
 * Binds a key combo ("Escape", "Mod+Enter", "/") while mounted. The handler
 * may change every render; return false from it to let the key pass on.
 */
export function useHotkey(
	combo: string,
	handler: (event: HotkeyEvent) => void | boolean,
	options?: UseHotkeyOptions
) {
	const {
		enabled = true,
		layer: explicitLayer,
		whileTyping,
		allowRepeat,
		withinRef
	} = options === undefined ? {} : options;
	const registry = useRegistry();
	const scopeLayer = useContext(LayerContext);
	const layer = explicitLayer ?? scopeLayer ?? registry.page;
	const latest = useRef(handler);
	latest.current = handler;
	useEffect(() => {
		if (!enabled) return;
		return registry.bind(layer, combo, (event) => latest.current(event), {
			whileTyping,
			allowRepeat,
			within: withinRef ? () => withinRef.current : undefined
		});
	}, [registry, layer, combo, enabled, whileTyping, allowRepeat, withinRef]);
}
