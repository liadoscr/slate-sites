import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const {code} = require('next/dist/build/swc').transformSync(readFileSync(new URL('../lib/stock/queries.ts', import.meta.url),'utf8'), {filename:'queries.ts',jsc:{parser:{syntax:'typescript'},target:'es2022'},module:{type:'commonjs'}});
const module = {exports:{}};
new Function('require','module','exports',code)(require,module,module.exports);
const {stockQueriesFor} = module.exports;
assert.deepEqual(stockQueriesFor([' Bonsai   Trees ', 'bonsai trees', 'violin restoration']), ['bonsai trees','violin restoration']);
for (const value of ['mail@example.com','https://example.com','phone 0501234567','private\ninformation','@someone','secret token','x'.repeat(81),'one two three four five six seven']) {
  assert.deepEqual(stockQueriesFor([value]), []);
}
assert.deepEqual(stockQueriesFor(['acme studio equipment','new york workshop','ceramic pottery'],['Acme Studio','New York']),['ceramic pottery']);
assert.deepEqual(stockQueriesFor(null),[]);
assert.deepEqual(stockQueriesFor(['honeycomb','beekeeping','beehive','ignored']),['honeycomb','beekeeping','beehive']);
assert.deepEqual(stockQueriesFor([{query:'plumbing'},'bonsai tools']),['bonsai tools']);
console.log('PASS dynamic stock queries, arbitrary industries, bounded output and identity/contact rejection');
