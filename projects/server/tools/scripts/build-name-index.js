const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const addon = require('../../build/Release/name_index.node');
const source = path.resolve(__dirname, '../../src/assets/AllPrintings.sqlite');
const target = path.resolve(__dirname, '../../build/src/public/NameLookup.nmi');
// What the index is, so a client can tell its copy is out of date: the card data version
// it was built from and its sha256, which names this build of it.
const infoTarget = path.resolve(__dirname, '../../build/src/public/NameLookup.info.json');
const database = new DatabaseSync(source, { readOnly: true });
const names = database
	.prepare('SELECT DISTINCT name FROM cards')
	.all()
	.map((row) => row.name);
const meta = database.prepare('SELECT date, version FROM meta').get();
database.close();
const blob = addon.build(names);
const info = {
	format: 1,
	version: meta.version,
	date: meta.date,
	builtAt: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
	names: names.length,
	bytes: blob.length,
	sha256: crypto.createHash('sha256').update(blob).digest('hex')
};
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, blob);
fs.writeFileSync(infoTarget, JSON.stringify(info, null, '\t') + '\n');
console.log(`Built ${target}: ${names.length} names, ${blob.length} bytes, sha256 ${info.sha256.slice(0, 12)}`);
