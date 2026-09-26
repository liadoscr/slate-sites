// Explicit opt-in smoke test: synthetic businesses, real provider quota, no database writes.
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
if (!process.argv.includes('--live')) {
  console.log('Use node --env-file=.env.local scripts/check-stock-live.mjs --live. Makes two Gemini calls and up to six Pexels searches; saves nothing.');
  process.exit(0);
}
const require = createRequire(import.meta.url), root = resolve(import.meta.dirname, '..'), cache = new Map();
function load(path) {
  let filename = resolve(root, path);
  if (!existsSync(filename)) filename += '.ts';
  if (cache.has(filename)) return cache.get(filename);
  const {code} = require('next/dist/build/swc').transformSync(readFileSync(filename,'utf8'), {filename,jsc:{parser:{syntax:'typescript'},target:'es2022'},module:{type:'commonjs'}});
  const module = {exports:{}};
  new Function('require','module','exports',code)(name => name === 'server-only' ? {} : name.startsWith('@/') ? load(name.slice(2)) : name.startsWith('.') ? load(resolve(dirname(filename),name)) : require(name),module,module.exports);
  cache.set(filename,module.exports); return module.exports;
}
const {generateSitePlan} = load('lib/ai/gemini');
const {defaultCreationSettings} = load('lib/creation/types');
const {findStockPhotos} = load('lib/stock/pexels');
const {errorCategory} = load('lib/observability/errors');
try {
  for (const [label, story] of [
    ['cooling', 'עסק להתקנה, תיקון וניקוי מזגנים לבתים ולעסקים.'],
    ['bonsai', 'סדנה לטיפוח וגיזום עצי בונסאי והדרכה על טיפול בעצים זעירים.'],
  ]) {
    const {stockQueries} = await generateSitePlan({businessName:'העסק שלי',businessStory:story,designReferences:[],creation:{...defaultCreationSettings(),creationMode:'automatic',imageSource:'stock',contactPreference:'form'}});
    const photos = await findStockPhotos(stockQueries, 2);
    // Queries are synthetic in this test, never actual customer records.
    console.log(JSON.stringify({sample:label,queries:stockQueries,downloaded:photos.length,photoIds:photos.map(photo=>photo.attribution.photoId)}));
    if (!stockQueries.length || !photos.length) throw new Error('Live sample produced no usable photos');
  }
} catch (error) {
  console.error(JSON.stringify({test:'stock-live',result:'failed',...errorCategory(error)}));
  process.exitCode = 1;
}
