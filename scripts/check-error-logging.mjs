import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../lib/observability/errors.ts', import.meta.url), 'utf8');
const { code } = require('next/dist/build/swc').transformSync(source, { filename:'errors.ts', jsc:{parser:{syntax:'typescript'},target:'es2022'},module:{type:'commonjs'} });
const module = { exports:{} };
new Function('require','module','exports',code)(name => name === 'server-only' ? {} : require(name),module,module.exports);
const {errorCategory,logOperationError,withErrorReference} = module.exports;
assert.equal(errorCategory({status:429,message:'secret quota details'}).category,'provider_quota');
assert.equal(errorCategory(new SyntaxError('Unexpected token private copy')).category,'invalid_model_output');
assert.equal(errorCategory(new Error('fetch failed')).category,'network');
assert.equal(errorCategory(null).category,'unclassified');
const original = console.error;
let output;
try {
  console.error = value => { output=value; };
  const reference = logOperationError({status:403,message:'API key SECRET email@example.com',stack:'PRIVATE_STACK'}, {operation:'generate',projectId:'d947afd5-a321-43c5-9a52-0d7d6ad43a6c',phase:'designing',prompt:'PRIVATE_PROMPT'});
  const event = JSON.parse(output);
  assert.equal(event.reference,reference);
  assert.equal(event.category,'provider_configuration');
  assert.equal(event.phase,'designing');
  assert.match(withErrorReference('Failure',reference),new RegExp(reference));
  assert.doesNotMatch(output,/SECRET|email@|PRIVATE|stack|prompt/);
  console.error=()=>{throw new Error('logger unavailable');};
  assert.doesNotThrow(()=>logOperationError(new Error('failure'),{operation:'analyze',projectId:'invalid'}));
} finally { console.error=original; }
console.log('PASS structured error references, classification, privacy allowlist and logging failure safety');
const originalInfo = console.info;
try {
  console.info = value => { output = value; };
  module.exports.logStockOutcome({ projectId: 'private@example.com', jobId: 'SECRET', prompt: 'PRIVATE_PROMPT' }, 'no_subject', 99);
  assert.equal(JSON.parse(output).outcome, 'no_subject');
  assert.equal(JSON.parse(output).count, 3);
  assert.doesNotMatch(output, /SECRET|private@|PRIVATE|prompt/);
  console.info = () => { throw new Error('logger unavailable'); };
  assert.doesNotThrow(() => module.exports.logStockOutcome({projectId:'',jobId:''}, 'added', 1));
} finally { console.info = originalInfo; }
console.log('PASS bounded stock-selection outcome logging without queries or private data');
