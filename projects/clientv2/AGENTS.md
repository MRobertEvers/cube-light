# Code style

These conventions apply to JavaScript and TypeScript in this project, including
application code, tests, workers, and tooling.

- Define named/standalone functions with `function` syntax, including functions
  assigned to variables or exported from a module.
- Arrow syntax is allowed for actual inline anonymous callbacks: functions passed
  as arguments (for example `filter`, `map`, promises, hooks, and event listeners)
  or passed as JSX event-handler props. Prefer concise arrows for simple returns.
  Keep required class method/constructor syntax and TypeScript function types.
- Use named exports. Do not use default exports. Update consumers when changing
  an export; default imports from external packages and assets are fine.
- Give each function argument a name in the signature. Do not destructure objects
  or arrays in parameter lists, including callback parameter lists.
- Destructure arguments as the first statement of the function body. Define
  property defaults in that destructuring statement, not in the signature. If
  multiple arguments need unpacking, keep those statements together at the start.
- Define positional argument defaults at the start of the body as well. Preserve
  the distinction between an omitted/undefined argument and an explicit `null`.
- In JavaScript, document argument interfaces with JSDoc `@typedef`, `@property`,
  and `@param` types, including optional properties and callbacks. Use TypeScript
  types/interfaces in TypeScript files.
- When converting an arrow that captures `this`, preserve the receiver explicitly.
  Callbacks used for subscriptions must retain a stable identity.

```js
/**
 * @typedef {Object} LoadOptions
 * @property {string} id
 * @property {number} [limit]
 * @property {(id: string) => void} [onLoaded]
 */

/** @param {LoadOptions} options */
export function load(options) {
    const { id, limit = 20, onLoaded = function () {} } = options;
    // Use id, limit, and onLoaded here.
}
```

If the whole options argument is optional, apply its fallback in the same first
statement: `const { limit = 20 } = options === undefined ? {} : options;`.
Keep existing behavior while applying these conventions.

Inline anonymous callbacks may use arrow syntax:

```js
const byWorkId = new Map(
    scans.filter((task) => task.workId).map((task) => [task.workId, task])
);

items.map((item) => {
    const { name, count = 1 } = item;
    return `${count} ${name}`;
});
```

The rules about named parameters, unpacking, and defaults also apply to lambdas.

# Architecture

`src/` is layered. Each layer imports only the layers below it; `test/layers.test.ts`
enforces this and fails on any violation or unresolved relative import.

```text
 app/            composition root: builds adapters, worker clients, the engine, the store
 ui/pages/       routes and screens            ─┐
 ui/features/    boards, deck chrome, widgets   ├─ React; data only via Redux
 ui/kit/         shared components and hooks   ─┘
 redux/          Redux slices, selectors and thunks; thunks receive the ToriMTGEngine as `extra`
 ═══════════════ UI ↔ data boundary: the ToriMTGEngine's semantic API ═══════════════
 engine/         ToriMTGEngine; imports only domain/ and its own ports (engine/ports.ts)
 ─────────────── port boundary ───────────────────────────────────────────────────────
 platform/       browser adapters implementing ports (IndexedDB, HTTP, crypto, device)
 workers/<name>/ <name>.worker.ts, <name>.client.ts (implements a port), <name>.protocol.ts
 domain/         pure models and rules
```

- Pass dependencies explicitly. Classes take their dependencies in the constructor;
  do not add wrapping binders (`withX`, `bindX`) or React contexts that hand out services.
- Components use selectors and dispatch thunks. They never import the engine, a
  worker client, or a platform adapter.
- A worker lives in `src/workers/<name>/` and is named `<Name>Worker`. Only its
  `.client.ts` starts it, and the engine reaches it through a port.
- A slice lives in `src/redux/<name>/`: `<name>.types.ts` (state and payload types),
  `<camelName>Slice.ts` (the `createSlice` and its actions), `<name>.thunks.ts` and
  `<name>.selectors.ts`. Selectors take `RootState`; components read them through
  `useAppSelector`, never with a hand-written root type.
- Engine changes reach Redux as `EngineEvents` (`redux/projections.ts`); notices tell
  the UI to reread, they do not carry data.
