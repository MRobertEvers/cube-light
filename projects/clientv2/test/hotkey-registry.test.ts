import test from 'node:test';
import assert from 'node:assert/strict';
import {
	HotkeyRegistry,
	type HotkeyElement,
	type HotkeyEvent
} from '../src/ui/kit/hotkeys/hotkey-registry';

type FakeElement = HotkeyElement & { children: FakeElement[] };

function element(tagName: string, type?: string): FakeElement {
	const node: FakeElement = {
		tagName,
		children: [],
		getAttribute: (name) => (name === 'type' ? (type ?? null) : null),
		contains: (other) =>
			other === node ||
			node.children.some((child) => child.contains(other))
	};
	return node;
}

function setup(isApple = false) {
	let listener: ((event: HotkeyEvent) => void) | null = null;
	let focused: FakeElement | null = null;
	const registry = new HotkeyRegistry({
		target: {
			addEventListener: (type, next) => {
				listener = next;
			},
			removeEventListener: () => {
				listener = null;
			}
		},
		activeElement: () => focused,
		isApple
	});
	function press(key: string, modifiers?: Partial<HotkeyEvent>) {
		const event: HotkeyEvent = {
			key,
			metaKey: false,
			ctrlKey: false,
			altKey: false,
			shiftKey: false,
			repeat: false,
			defaultPrevented: false,
			preventDefault: () => {
				event.defaultPrevented = true;
			}
		};
		if (modifiers) Object.assign(event, modifiers);
		listener?.(event);
		return event;
	}
	function focus(next: FakeElement | null) {
		focused = next;
	}
	return { registry, press, focus };
}

test('the topmost dialog gets Escape and blocks the page', () => {
	const { registry, press } = setup();
	const calls: string[] = [];
	registry.bind(registry.page, 'Escape', () => {
		calls.push('page');
	});
	const dialog = registry.createLayer('dialog');
	registry.bind(dialog, 'Escape', () => {
		calls.push('dialog');
	});
	registry.activate(dialog);
	const event = press('Escape');
	assert.deepEqual(calls, ['dialog']);
	assert.equal(event.defaultPrevented, true);

	registry.deactivate(dialog);
	press('Escape');
	assert.deepEqual(calls, ['dialog', 'page']);
});

test('keys without a binding in the dialog do not leak to the page', () => {
	const { registry, press } = setup();
	const calls: string[] = [];
	registry.bind(registry.page, '/', () => {
		calls.push('search');
	});
	const dialog = registry.createLayer('dialog');
	registry.activate(dialog);
	press('/');
	assert.deepEqual(calls, []);
});

test('a menu closes first but lets other keys through to the page', () => {
	const { registry, press } = setup();
	const calls: string[] = [];
	registry.bind(registry.page, 'Escape', () => {
		calls.push('page escape');
	});
	registry.bind(registry.page, '/', () => {
		calls.push('search');
	});
	const menu = registry.createLayer('menu');
	registry.bind(menu, 'Escape', () => {
		calls.push('menu');
	});
	registry.activate(menu);
	press('Escape');
	press('/');
	assert.deepEqual(calls, ['menu', 'search']);
});

test('layers stack by creation, so a parent stays under a child mounted first', () => {
	const { registry, press } = setup();
	const calls: string[] = [];
	const parent = registry.createLayer('dialog');
	const child = registry.createLayer('dialog');
	registry.bind(parent, 'Escape', () => {
		calls.push('parent');
	});
	registry.bind(child, 'Escape', () => {
		calls.push('child');
	});
	// React runs the child's effects before the parent's.
	registry.activate(child);
	registry.activate(parent);
	press('Escape');
	assert.deepEqual(calls, ['child']);
});

test('the layer holding focus is asked first', () => {
	const { registry, press, focus } = setup();
	const calls: string[] = [];
	const dialog = registry.createLayer('dialog');
	const menu = registry.createLayer('menu');
	const dialogRoot = element('div');
	const menuRoot = element('div');
	const menuItem = element('button');
	menuRoot.children.push(menuItem);
	registry.bind(dialog, 'Enter', () => {
		calls.push('dialog');
	});
	registry.bind(menu, 'Enter', () => {
		calls.push('menu');
	});
	// The dialog was opened from the menu, so it is on top of the stack.
	registry.activate(menu, () => menuRoot);
	const late = registry.createLayer('popover');
	registry.activate(late, () => dialogRoot);
	focus(menuItem);
	press('Enter');
	assert.deepEqual(calls, ['menu']);
});

test('plain keys wait while typing; Escape and Mod combos do not', () => {
	const { registry, press, focus } = setup();
	const calls: string[] = [];
	registry.bind(registry.page, 'n', () => {
		calls.push('n');
	});
	registry.bind(registry.page, 'Escape', () => {
		calls.push('escape');
	});
	registry.bind(registry.page, 'Mod+Enter', () => {
		calls.push('save');
	});
	focus(element('input', 'text'));
	press('n');
	press('Escape');
	press('Enter', { ctrlKey: true });
	assert.deepEqual(calls, ['escape', 'save']);

	focus(element('input', 'checkbox'));
	press('n');
	assert.deepEqual(calls, ['escape', 'save', 'n']);
});

test('a widget that already handled the key wins', () => {
	const { registry, press } = setup();
	const calls: string[] = [];
	registry.bind(registry.page, 'Escape', () => {
		calls.push('page');
	});
	press('Escape', { defaultPrevented: true });
	assert.deepEqual(calls, []);
});

test('Mod is Meta on Apple platforms and Ctrl elsewhere', () => {
	const apple = setup(true);
	const other = setup(false);
	const calls: string[] = [];
	apple.registry.bind(apple.registry.page, 'Mod+k', () => {
		calls.push('apple');
	});
	other.registry.bind(other.registry.page, 'Mod+k', () => {
		calls.push('other');
	});
	apple.press('k', { ctrlKey: true });
	apple.press('k', { metaKey: true });
	other.press('k', { metaKey: true });
	other.press('k', { ctrlKey: true });
	assert.deepEqual(calls, ['apple', 'other']);
});

test('a handler returning false passes the key on; newest binding goes first', () => {
	const { registry, press } = setup();
	const calls: string[] = [];
	registry.bind(registry.page, 'Escape', () => {
		calls.push('older');
	});
	registry.bind(registry.page, 'Escape', () => {
		calls.push('newer');
		return false;
	});
	press('Escape');
	assert.deepEqual(calls, ['newer', 'older']);
});

test('held keys fire once unless the binding allows repeats', () => {
	const { registry, press } = setup();
	const calls: string[] = [];
	registry.bind(registry.page, 'j', () => {
		calls.push('j');
	});
	registry.bind(
		registry.page,
		'k',
		() => {
			calls.push('k');
		},
		{ allowRepeat: true }
	);
	press('j', { repeat: true });
	press('k', { repeat: true });
	assert.deepEqual(calls, ['k']);
});

test('symbols match regardless of the Shift needed to type them', () => {
	const { registry, press } = setup();
	const calls: string[] = [];
	registry.bind(registry.page, '?', () => {
		calls.push('help');
	});
	press('?', { shiftKey: true });
	assert.deepEqual(calls, ['help']);
});
