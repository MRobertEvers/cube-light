# ToriMTG core

Shared, framework-independent commands, accepted events, reducers, protocol DTOs,
and canonical serialization. Browser adapters live in `clientv2/src/platform`;
the SQLite ledger and bearer authentication live in `server/src/sync` and
`server/src/auth`. See [the offline design](../../OFFLINE-DESIGN.md).

Install dependencies in both applications, then run `npm run build` here. Both
applications' build commands build this package first. The package uses the client
TypeScript compiler and emits portable ESM plus declarations for both applications.

`npm test` checks the deterministic command/event contract. No reducer performs
I/O, reads a clock, or generates IDs. Checkpoints are per aggregate, with versioned
state and an accepted-event watermark; pending device intent stays separate.
