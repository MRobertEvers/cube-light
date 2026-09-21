const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const addon = require('../../build/Release/name_index.node');
const source = path.resolve(__dirname, '../../src/assets/AllPrintings.sqlite');
const target = path.resolve(__dirname, '../../build/src/public/NameLookup.nmi');
const database = new DatabaseSync(source, { readOnly: true });
const names = database.prepare('SELECT DISTINCT name FROM cards').all().map((row) => row.name);
database.close();
const blob = addon.build(names);
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, blob);
console.log(`Built ${target}: ${names.length} names, ${blob.length} bytes`);
