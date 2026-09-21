import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTokenCatalog,CatalogLogitsProcessor} from './catalog-logits.js';
const tokenizer={encode:text=>[...text].map(c=>c.charCodeAt(0))};
const catalog=buildTokenCatalog(tokenizer,['Axe','Axeman','Blast','A-Digital'],[0,1]);
const logits=()=>({data:new Float32Array(128)});
test('catalog excludes rebalanced names and retains shared prefixes',()=>{
 assert.equal(catalog.byName.has('A-Digital'),false);
 assert.deepEqual(catalog.byName.get('Axeman'),tokenizer.encode('Axeman'));
});
test('partial names cannot terminate; unrelated tokens are masked',()=>{
 const p=new CatalogLogitsProcessor(catalog,1),l=logits();p._call([[99,65]],l);
 assert.equal(l.data[120],0);assert.equal(l.data[0],-Infinity);assert.equal(l.data[66],-Infinity);
});
test('a complete name may terminate or continue to a longer name',()=>{
 const p=new CatalogLogitsProcessor(catalog,1),l=logits();p._call([[99,...tokenizer.encode('Axe')]],l);
 assert.equal(l.data[0],0);assert.equal(l.data[1],0);assert.equal(l.data[109],0);
});
test('support is measured against original logits, before constraint renormalization',()=>{
 const p=new CatalogLogitsProcessor(catalog,1),l=logits();l.data[90]=10;p._call([[99]],l);
 assert.ok(p.records[0].allowedMass<.001);
 assert.ok(p.records[0].selected.logProbability < -10);
});
test('forced hypotheses remain constrained to the catalog',()=>{
 const p=new CatalogLogitsProcessor(catalog,1,[90]);assert.throws(()=>p._call([[99]],logits()),/Invalid forced/);
});
test('an invalid generated prefix fails instead of silently inventing a completion',()=>{
 const p=new CatalogLogitsProcessor(catalog,1);assert.throws(()=>p._call([[99,90]],logits()),/escaped/);
});
