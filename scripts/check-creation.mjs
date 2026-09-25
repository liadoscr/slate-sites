// Offline behavior checks: mocked AI/database only; no user data or network calls.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
const require = createRequire(import.meta.url);
const swc = require('next/dist/build/swc');
const root = resolve(import.meta.dirname, '..');
const cache = new Map(); const mocks = new Map();
function load(path) {
  let filename = resolve(root, path);
  if (!existsSync(filename)) filename += existsSync(`${filename}.ts`) ? '.ts' : '.tsx';
  if (cache.has(filename)) return cache.get(filename);
  const { code } = swc.transformSync(readFileSync(filename, 'utf8'), { filename, jsc: { parser: { syntax: 'typescript', tsx: filename.endsWith('.tsx') }, transform: { react: { runtime: 'automatic' } }, target: 'es2022' }, module: { type: 'commonjs' } });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => {
    if (name === 'server-only') return {};
    if (mocks.has(name)) return mocks.get(name);
    if (name.endsWith('.css')) return new Proxy({}, { get: (_, key) => String(key) });
    if (name.startsWith('@/')) return load(name.slice(2));
    if (name.startsWith('.')) return load(resolve(dirname(filename), name));
    return require(name);
  }, module, module.exports);
  cache.set(filename, module.exports); return module.exports;
}
const projectId = '00000000-0000-4000-8000-000000000001';
const imageId = '00000000-0000-4000-8000-000000000002';
const photoId = '00000000-0000-4000-8000-000000000003';
const { defaultCreationSettings } = load('lib/creation/types.ts');
const { parseCreationSettings, parseFocalPoint } = load('lib/creation/validation.ts');
const settings = { ...defaultCreationSettings(), referenceAssetId: imageId, images: [{ id: imageId, role: 'reference', alt: 'השראה בלבד' }, { id: photoId, role: 'hero', alt: 'בית העסק', focalPoint: { x: 25, y: 50, mobileX: 65, mobileY: 40 } }] };
assert.deepEqual(parseCreationSettings(settings), settings);
for (const value of [NaN, -1, 101, '50']) assert.throws(() => parseFocalPoint({ x: value, y: 50, mobileX: 50, mobileY: 50 }));
assert.throws(() => parseCreationSettings({ ...settings, referenceAssetId: null }));
assert.throws(() => parseCreationSettings({ ...settings, images: [...settings.images, settings.images[0]] }));
assert.throws(() => parseCreationSettings({ ...settings, brandColor: 'url(x)' }));
assert.equal(parseCreationSettings({ ...settings, analysis: { summary: 'client forged' } }).analysis, undefined);
console.log('PASS creation choices, private-reference identity and focal points are bounded');

assert.equal(defaultCreationSettings().motion, 'off');
const legacySettings = { ...settings }; delete legacySettings.motion;
assert.equal(parseCreationSettings(legacySettings).motion, 'off');
for (const motion of ['off', 'subtle', 'expressive']) assert.equal(parseCreationSettings({ ...settings, motion }).motion, motion);
for (const motion of [null, 'spin', 'EXPRESSIVE', {}, ['subtle'], true]) assert.equal(parseCreationSettings({ ...settings, motion }).motion, 'off');
console.log('PASS animation settings are opt-in, allowlisted, and backwards compatible');

let owner = true; let stored = structuredClone(settings); let assetRows = [];
const uploads = []; let downloads = 0;
const client = {
  from(table) {
    const query = {
      select() { return query; }, eq() { return query; }, in() { return query; }, order() { return query; }, limit() { return query; },
      maybeSingle: async () => ({ data: table === 'projects' ? (owner ? { id: projectId } : null) : { details: stored }, error: null }),
      single: async () => ({ data: assetRows[0], error: null }),
      then: (ok, fail) => Promise.resolve({ data: assetRows, error: null }).then(ok, fail),
    }; return query;
  },
  storage: { from() { return { download: async () => { downloads++; return { data: new Blob([Uint8Array.from([255, 216, 255, 0])]), error: null }; } }; } },
};
const admin = {
  from() { return { insert: async value => { stored = structuredClone(value.details); return { error: null }; } }; },
  storage: { from(bucket) { return { upload: async (path, bytes, options) => { uploads.push({ bucket, path, bytes, options }); return { error: null }; } }; } },
};
mocks.set('@/lib/supabase/server', { createClient: async () => client });
mocks.set('@/lib/supabase/admin', { createAdminClient: () => admin });
mocks.set('@/lib/data/current-user', { getCurrentUser: async () => ({ id: 'test-owner' }) });
const { selectedImages, snapshotImages, parseImageChoices } = load('lib/sites/workspace-server.ts');
assert.throws(() => parseImageChoices([{ id: imageId, role: 'reference', alt: 'a' }, { id: photoId, role: 'reference', alt: 'b' }]));
const { saveCreationSettings, loadCreationSettings } = load('lib/creation/server.ts');
await assert.rejects(saveCreationSettings(projectId, 'test-owner', { ...settings, images: settings.images.map(image => ({ ...image, role: 'reference' })) }));
assetRows = [{ id: imageId, storage_path: `${projectId}/reference/${imageId}`, size_bytes: 4, mime_type: 'image/jpeg' }];
await assert.rejects(selectedImages(projectId, [{ id: imageId, role: 'hero', alt: 'attempt' }]), /פרטית/);
assert.equal(downloads, 0);
const reference = await selectedImages(projectId, [settings.images[0]]);
assert.equal(reference[0].model.role, 'reference');
assert.deepEqual(await snapshotImages(projectId, 'request', reference), []);
assert.equal(uploads.length, 0);
assetRows = [{ id: photoId, storage_path: `${projectId}/business/${photoId}`, size_bytes: 4, mime_type: 'image/jpeg' }];
const businessImages = await selectedImages(projectId, [settings.images[1]]);
const published = await snapshotImages(projectId, 'request', businessImages);
assert.deepEqual(published[0].focalPoint, settings.images[1].focalPoint);
assert.equal(uploads[0].bucket, 'site-version-assets');
console.log('PASS private screenshot cannot become a public image; business snapshots retain crop choices');

assetRows = [{ id: imageId, storage_path: `${projectId}/reference/${imageId}`, size_bytes: 4, mime_type: 'image/jpeg' }, { id: photoId, storage_path: `${projectId}/business/${photoId}`, size_bytes: 4, mime_type: 'image/jpeg' }];
const creationRoute = load('app/api/projects/[projectId]/creation/route.ts');
const context = { params: Promise.resolve({ projectId }) };
const request = (method, body, origin = 'https://app.test') => new Request(`https://app.test/api/projects/${projectId}/creation`, { method, headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
for (const motion of ['off', 'subtle', 'expressive']) {
  assert.equal((await creationRoute.PUT(request('PUT', { settings: { ...settings, motion } }), context)).status, 200);
  assert.equal(stored.motion, motion);
  assert.equal((await loadCreationSettings(projectId)).motion, motion);
  const loaded = await creationRoute.GET(new Request('https://app.test'), context);
  assert.equal(loaded.status, 200);
  assert.equal((await loaded.json()).settings.motion, motion);
}
stored = structuredClone(legacySettings);
assert.equal((await loadCreationSettings(projectId)).motion, 'off');
console.log('PASS animation choices persist and reload through the owner-scoped settings API');
stored.analysis = { summary: 'server analysis', palette: ['#123456'], layout: 'split', mode: 'light', density: 'airy', typography: 'modern', features: [] };
stored.locks = { design: true, text: false };
assert.equal((await creationRoute.PUT(request('PUT', { settings: { ...settings, notes: 'New note', analysis: { summary: 'forged' } } }), context)).status, 200);
assert.equal(stored.analysis.summary, 'server analysis');
assert.equal(stored.locks.design, true);
assert.equal((await creationRoute.PATCH(request('PATCH', { locks: { design: false, text: true } }), context)).status, 200);
assert.deepEqual(stored.locks, { design: false, text: true });
assert.equal(stored.notes, 'New note');
assert.equal((await creationRoute.PUT(request('PUT', { settings }, 'https://other.test'), context)).status, 403);
owner = false;
assert.equal((await creationRoute.GET(new Request('https://app.test'), context)).status, 404);
console.log('PASS settings API preserves server analysis and locks, scoped lock changes, CSRF and owner isolation');

let output; let modelInput;
mocks.set('@google/genai', { GoogleGenAI: class { models = { generateContent: async input => { modelInput = input; return { text: JSON.stringify(output) }; } }; } });
process.env.GEMINI_API_KEY = 'offline-placeholder';
const engine = load('lib/ai/gemini.ts');
const plan = { version: 1, siteTitle: 'עסק', positioning: 'הסיפור של העסק', contactCta: 'צרו קשר', visualDirection: { summary: 'private-notes', palette: ['#5048e5'], typography: '', layout: '' }, seo: { title: 'עסק', description: 'תיאור העסק', keywords: [] }, missingInformation: [], reviewNotes: [], theme: { layout: 'split', accent: '#ccff00', mode: 'dark', density: 'airy', font: 'modern', corners: 'soft' }, sections: Array.from({ length: 5 }, (_, i) => ({ id: `s-${i}`, headline: 'כותרת', body: 'תוכן', label: 'מקטע', kind: i === 0 ? 'hero' : i === 4 ? 'contact' : 'services', imageId })) };
output = plan;
const generated = await engine.generateSitePlan({ businessName: 'עסק', designReferences: [], creation: { ...settings, analysis: { summary: 'מבנה כרטיסים', palette: ['#ccff00'], layout: 'bento', mode: 'dark', density: 'compact', typography: 'editorial', features: [] } } }, [{ id: imageId, role: 'reference', alt: 'השראה', mimeType: 'image/jpeg', data: 'test' }]);
assert.equal(generated.plan.theme.layout, 'bento');
assert.equal(generated.plan.theme.mode, 'dark');
assert.equal(generated.plan.theme.density, 'compact');
assert.ok(generated.plan.sections.every(section => !section.imageId));
assert.ok(modelInput.config.systemInstruction.includes('Never invent reviews'));
const { themeFor } = load('lib/sites/document.ts');
for (const motion of ['off', 'subtle', 'expressive']) {
  output = { ...plan, theme: { ...plan.theme, motion: motion === 'expressive' ? 'off' : 'expressive' } };
  const chosen = await engine.generateSitePlan({ businessName: 'עסק', designReferences: [], creation: { ...settings, motion } });
  assert.equal(chosen.plan.theme.motion, motion, 'explicit owner preference overrides AI output');
}
output = { ...plan, theme: { ...plan.theme, motion: 'expressive' } };
for (const creation of [undefined, legacySettings, { ...settings, motion: 'untrusted-animation' }]) {
  const noOptIn = await engine.generateSitePlan({ businessName: 'עסק', designReferences: [], creation });
  assert.equal(themeFor(noOptIn.plan).motion, 'off', 'AI output cannot opt a site into animations');
}
console.log('PASS generation uses the explicit animation setting and ignores model-injected motion');
const automatic = { ...defaultCreationSettings(), creationMode: 'automatic', imageSource: 'stock', contactPreference: 'form' };
assert.deepEqual(parseCreationSettings(automatic), automatic);
output = { ...plan, stockSubject: 'butcher', theme: { ...plan.theme, layout: 'editorial' } };
const quick = await engine.generateSitePlan({ businessName: 'העסק שלי', businessStory: 'קצבייה משפחתית', designReferences: [], creation: automatic });
assert.equal(quick.plan.theme.layout, 'editorial', 'automatic layout is not overwritten by the default starter');
assert.equal(quick.plan.contactPreference, 'form');
assert.deepEqual(quick.stockQueries, ['fresh meat butcher counter']);
assert.ok(modelInput.config.responseJsonSchema.required.includes('stockSubject'));
output = { ...plan, stockSubject: 'private@example.com 0501234567 https://evil.test' };
assert.deepEqual((await engine.generateSitePlan({ businessName: 'עסק', designReferences: [], creation: automatic })).stockQueries, []);
console.log('PASS automatic mode round-trip, model layout choice, blank-contact form default and allowlisted outbound stock query');
output = { layout: 'band', tone: 'accent', headline: 'malicious text change' };
const original = { id: 'about', kind: 'about', label: 'אודות', headline: 'קיים', body: 'תוכן מקורי', imageId: photoId };
assert.deepEqual(await engine.redesignSection(original, 'פס צבע', plan.theme), { ...original, presentation: { layout: 'band', tone: 'accent' } });
await assert.rejects(engine.redesignSection({ ...original, kind: 'hero' }, 'change', plan.theme));
console.log('PASS image-first generation respects design settings; design-only edit cannot replace copy or image');

const { SiteRenderer } = load('components/sites/site-renderer.tsx');
const { paletteFor, contrastRatio } = load('lib/sites/document.ts');
const React = require('react'); const { renderToStaticMarkup } = require('react-dom/server');
for (const layout of ['split', 'editorial', 'centered', 'immersive', 'bento']) for (const mode of ['light', 'dark']) {
  const theme = { ...plan.theme, layout, mode };
  const html = renderToStaticMarkup(React.createElement(SiteRenderer, { plan: { ...plan, theme, images: published }, projectId, versionId: 'version' }));
  assert.ok(html.includes(`data-layout="${layout}"`));
  assert.ok(html.includes(`data-mode="${mode}"`));
  assert.ok(!html.includes('private-notes'));
  assert.equal((html.match(/<h1/g) || []).length, 1);
  for (const accent of ['#ffffff', '#000000', '#ccff00', '#ff0000', '#5048e5']) {
    const palette = paletteFor({ ...theme, accent });
    assert.ok(contrastRatio(palette.accent, palette.onAccent) >= 4.5);
    assert.ok(contrastRatio(palette.surface, palette.accent) >= 4.5);
  }
}
console.log('PASS five layouts in light/dark modes and computed palette contrast');
console.log('Creation offline checks passed. Live Gemini, Supabase and signed-in browser flows require connected services.');
