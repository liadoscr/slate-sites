import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../lib/stock/pexels.ts', import.meta.url), 'utf8');
const { code } = require('next/dist/build/swc').transformSync(source, { filename: 'pexels.ts', jsc: { parser: { syntax: 'typescript' }, target: 'es2022' }, module: { type: 'commonjs' } });
const module = { exports: {} };
new Function('require', 'module', 'exports', code)(name => name === 'server-only' ? {} : require(name), module, module.exports);
const { findStockPhotos, StockPhotoError } = module.exports;

const jpeg = Buffer.from([255, 216, 255, 224, 0, 8, 1]);
const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1]);
const webp = Buffer.from('RIFF1234WEBP1234');
const photo = (id, override = {}) => ({
  id, url: `https://www.pexels.com/photo/example-${id}/`,
  photographer: 'Example Photographer', photographer_url: 'https://www.pexels.com/@example-photographer',
  src: { landscape: `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&w=1200` },
  alt: `Illustrative photo ${id}`, ...override,
});
const api = photos => new Response(JSON.stringify({ photos }), { headers: { 'Content-Type': 'application/json' } });
const img = (bytes = jpeg, type = 'image/jpeg') => new Response(bytes, { headers: { 'Content-Type': type } });
const key = 'SYNTHETIC_KEY_DO_NOT_LOG';
const calls = [];
const responses = [api([photo(1), photo(4)]), api([photo(1), photo(2)]), api([photo(3)]), img(jpeg), img(png, 'image/png'), img(webp, 'image/webp')];
const result = await findStockPhotos(['   butcher   meat ', ' fresh produce ', ' bakery ', 'IGNORED'], 12, {
  apiKey: key,
  fetch: async (url, options) => { calls.push({ url: new URL(url), options }); return responses.shift(); },
});
assert.equal(result.length, 3);
assert.deepEqual(result.map(item => item.attribution.photoId), ['1', '2', '3']);
assert.deepEqual(result.map(item => item.mimeType), ['image/jpeg', 'image/png', 'image/webp']);
assert(result.every(item => Buffer.isBuffer(item.bytes) && !('imageUrl' in item)));
assert(calls.every(call => call.options.redirect === 'error' && call.options.cache === 'no-store' && call.options.signal instanceof AbortSignal));
assert(calls.slice(0, 3).every(call => call.url.origin === 'https://api.pexels.com' && call.url.pathname === '/v1/search' && call.url.searchParams.get('per_page') === '5' && call.url.searchParams.get('orientation') === 'landscape' && call.options.headers.Authorization === key));
assert(calls.slice(3).every(call => call.url.origin === 'https://images.pexels.com' && !call.options.headers.Authorization));
assert(calls.every(call => !call.url.href.includes(key)));
assert.equal(calls[0].url.searchParams.get('query'), 'butcher meat');

assert.deepEqual(await findStockPhotos([], 3, { apiKey: '' }), []);
assert.deepEqual(await findStockPhotos(['food'], 0, { apiKey: '' }), []);
await assert.rejects(findStockPhotos(['food'], 3, { apiKey: '' }), error => error instanceof StockPhotoError && error.code === 'configuration');
for (const status of [401, 403, 429, 500]) {
  let count = 0;
  await assert.rejects(findStockPhotos(['food'], 3, { apiKey: key, fetch: async () => { count++; return new Response('PRIVATE_PROVIDER_BODY', { status }); } }), error => {
    assert.equal(error.status, status);
    assert.equal(error.code, [401, 403].includes(status) ? 'configuration' : status === 429 ? 'rate_limit' : 'network');
    assert(!JSON.stringify(error).includes('PRIVATE_PROVIDER_BODY'));
    assert(!error.message.includes(key));
    assert(!error.cause);
    return true;
  });
  assert.equal(count, 1, 'provider failures are not retried');
}
await assert.rejects(findStockPhotos(['food'], 3, { apiKey: key, fetch: async () => { throw new Error(`PRIVATE_URL key=${key}`); } }), error => error.code === 'network' && !error.message.includes('PRIVATE_URL') && !error.cause);
await assert.rejects(findStockPhotos(['food'], 3, {
  apiKey: key, timeoutMs: 5,
  fetch: async (_, options) => new Promise((_, reject) => { options.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }); }),
}), error => error.code === 'timeout');

for (const invalid of [new Response('not JSON'), api(null), new Response(JSON.stringify({ photos: [] }), { headers: { 'Content-Length': String(300_000) } })]) {
  await assert.rejects(findStockPhotos(['food'], 3, { apiKey: key, fetch: async () => invalid }), error => error.code === 'invalid_response');
}
assert.deepEqual(await findStockPhotos(['food'], 3, { apiKey: key, fetch: async () => api([]) }), []);

const unsafeImages = [
  'http://images.pexels.com/photos/1/x.jpeg', 'https://images.pexels.com.evil.example/photos/1/x.jpeg',
  'https://127.0.0.1/photos/1/x.jpeg', 'https://images.pexels.com:444/photos/1/x.jpeg',
  'https://user:pass@images.pexels.com/photos/1/x.jpeg', 'https://images.pexels.com/photos/1/x.svg',
  'https://images.pexels.com/photos/1/x.jpeg#private', 'https://images.pexels.com/redirect.jpeg',
];
const unsafePhotos = [
  ...unsafeImages.map(url => photo(1, { src: { landscape: url } })),
  photo(1, { url: 'https://evil.example/photo/a/' }), photo(1, { url: 'https://www.pexels.com/@someone' }),
  photo(1, { photographer_url: 'https://www.pexels.com/redirect?url=evil' }), photo(1, { photographer_url: 'javascript:alert(1)' }),
  photo(1, { photographer_url: 'https://person@www.pexels.com/@someone' }), photo(1, { id: '1' }),
];
for (const unsafe of unsafePhotos) {
  let requests = 0;
  assert.deepEqual(await findStockPhotos(['food'], 3, { apiKey: key, fetch: async () => { requests++; return api([unsafe]); } }), []);
  assert.equal(requests, 1, 'unsafe result is never downloaded');
}

for (const imageResponse of [img(Buffer.from('<svg>not an image</svg>')), img(jpeg, 'image/png'), img(Buffer.alloc(0)), new Response(jpeg, { headers: { 'Content-Length': String(4 * 1024 * 1024 + 1), 'Content-Type': 'image/jpeg' } })]) {
  let count = 0;
  assert.deepEqual(await findStockPhotos(['food'], 3, { apiKey: key, fetch: async () => ++count === 1 ? api([photo(1)]) : imageResponse }), []);
  assert.equal(count, 2);
}

let cancelled = false;
let requestCount = 0;
const oversized = new ReadableStream({
  pull(controller) { controller.enqueue(new Uint8Array(1024 * 1024)); },
  cancel() { cancelled = true; },
});
assert.deepEqual(await findStockPhotos(['food'], 1, { apiKey: key, fetch: async () => ++requestCount === 1 ? api([photo(1)]) : new Response(oversized, { headers: { 'Content-Type': 'image/jpeg' } }) }), []);
assert(cancelled, 'oversized streaming response is cancelled without content-length');

let totalRequests = 0;
const fourMb = Buffer.alloc(4 * 1024 * 1024);
jpeg.copy(fourMb);
const bounded = await findStockPhotos(['food'], 3, { apiKey: key, fetch: async () => ++totalRequests === 1 ? api([photo(1), photo(2), photo(3)]) : img(fourMb) });
assert.equal(bounded.length, 2);
assert.equal(totalRequests, 3, '8 MB total stops the third image request');
assert.equal(bounded.reduce((size, item) => size + item.bytes.length, 0), 8 * 1024 * 1024);
assert.match(source, /^import 'server-only';/);
assert.doesNotMatch(source, /console\.(log|error|warn)|GoogleGenAI|generateContent/);
console.log('PASS stock provider: synthetic-only search, attribution, secret isolation, URL allowlists, no redirects/retries, strict image/JSON read bounds, timeout and safe errors');
