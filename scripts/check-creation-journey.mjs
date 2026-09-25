// Synthetic component checks only: no Supabase writes or AI requests.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const require = createRequire(import.meta.url);
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const id = '00000000-0000-4000-8000-000000000001';
const jobId = '00000000-0000-4000-8000-000000000002';
const photoId = '00000000-0000-4000-8000-000000000003';
function load(path, mocks = {}) {
  const { code } = require('next/dist/build/swc').transformSync(read(path), { filename: path, jsc: { parser: { syntax: 'typescript', tsx: true }, transform: { react: { runtime: 'automatic' } }, target: 'es2022' }, module: { type: 'commonjs' } });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => {
    if (name in mocks) return mocks[name];
    if (name.endsWith('.css')) return new Proxy({}, { get: (_, key) => key === '__esModule' ? false : String(key) });
    if (name.startsWith('@/')) return load(`${name.slice(2)}.ts`, mocks);
    return require(name);
  }, module, module.exports);
  return module.exports;
}
function harness(overrides = {}) {
  let cursor = 0;
  const slots = [];
  const effects = [];
  const hooks = { ...React,
    useState(initial) { const slot = cursor++; if (!(slot in slots)) slots[slot] = slot in overrides ? overrides[slot] : typeof initial === 'function' ? initial() : initial; return [slots[slot], value => { slots[slot] = typeof value === 'function' ? value(slots[slot]) : value; }]; },
    useRef(initial) { const slot = cursor++; if (!(slot in slots)) slots[slot] = { current: initial }; return slots[slot]; },
    useEffect(callback) { effects.push(callback); },
  };
  return { slots, effects, hooks, reset() { cursor = 0; effects.length = 0; } };
}
const nodes = tree => !tree || typeof tree !== 'object' ? [] : [tree, ...React.Children.toArray(tree.props?.children).flatMap(nodes)];
const text = tree => typeof tree === 'string' ? tree : typeof tree === 'number' ? String(tree) : !tree ? '' : React.Children.toArray(tree.props?.children).map(text).join('');
const { defaultCreationSettings } = load('lib/creation/types.ts');
const brief = { businessName: 'עסק לדוגמה', businessType: 'קצבייה', location: '', businessStory: 'מוצרי בשר טריים ושירות אישי', primaryGoal: '', websiteCopy: '', importantLinks: '', tone: '', colors: '', contactEmail: '', contactPhone: '', designNotes: '', designUrl: '' };
const reference = { id: photoId, role: 'reference', alt: 'דוגמת עיצוב' };
const refSettings = { ...defaultCreationSettings(), referenceAssetId: photoId, images: [reference] };
const asset = { id: photoId, original_name: 'example.webp', storage_path: `${id}/reference/${photoId}`, size_bytes: 100, mime_type: 'image/webp' };
const calls = [];
async function settle() { for (let i = 0; i < 30; i++) await new Promise(resolve => setImmediate(resolve)); }
let destination;
globalThis.localStorage = { removeItem() {}, setItem() {}, getItem() { return null; } };
globalThis.requestAnimationFrame = callback => callback();
const router = { replace(url) { destination = url; }, refresh() {} };
globalThis.fetch = async (url, init) => {
  calls.push({ url, body: init?.body });
  if (url.endsWith('/generate')) return Response.json({ jobId, state: 'running' });
  if (url.endsWith('/analyze')) return Response.json({ settings: { ...refSettings, analysis: { summary: 'כהה וירוק', features: [], palette: ['#112233'] } } });
  if (url.endsWith('/assets') && init?.method === 'POST') return Response.json({ asset: { ...asset, storage_path: `${id}/business/${photoId}` }, image: { id: photoId, alt: 'תמונת עסק', role: init.body.get('role') } });
  if (url.endsWith('/creation') && init?.body) return Response.json({ settings: JSON.parse(init.body).settings });
  return Response.json({});
};
function wizard(overrides = {}) {
  // Initial state ordering: brief, settings, assets, step, ready ...
  const h = harness({ 4: true, ...overrides });
  const { CreationWizard } = load('components/projects/creation-wizard.tsx', { react: h.hooks, 'next/navigation': { useRouter: () => router } });
  return { ...h, render() { h.reset(); return CreationWizard({ userId: id, projectId: id, initialBrief: brief }); } };
}
let w = wizard(), tree = nodes(w.render());
assert.equal(tree.filter(n => n.props?.['aria-current'] === 'step').length, 1);
assert.equal(tree.filter(n => n.type === 'input' && ['tel', 'email'].includes(n.props.type)).length, 0);
assert.ok(!text(w.render()).includes('YOUR NEXT WEBSITE'));
assert.ok(text(w.render()).includes('מתוך 3'));
await tree.find(n => n.type === 'button' && text(n) === 'המשך ←').props.onClick();
await settle();
assert.equal(w.slots[3], 1);
console.log('PASS short business screen, three steps, no promotional sidebar');

// Run the real autosave effect with a controlled timer; no network or elapsed wait.
const originalWindow = globalThis.window;
let autosave;
globalThis.window = { setTimeout(callback) { autosave = callback; return 1; }, clearTimeout() {} };
w = wizard({ 3: 1 }); tree = nodes(w.render());
const motionControl = () => nodes(w.render()).find(n => n.type === 'select' && n.props['aria-describedby'] === 'creation-motion-help');
assert.equal(motionControl().props.value, 'off');
assert.deepEqual(nodes(motionControl()).filter(n => n.type === 'option').map(n => n.props.value), ['off', 'subtle', 'expressive']);
for (const motion of ['subtle', 'expressive', 'off']) {
  motionControl().props.onChange({ target: { value: motion } });
  assert.equal(w.slots[1].motion, motion);
  w.render(); calls.length = 0;
  const stopAutosave = w.effects[1]();
  assert.equal(typeof autosave, 'function'); autosave(); await settle(); stopAutosave();
  const write = calls.find(c => c.url.endsWith('/creation'));
  assert.equal(JSON.parse(write.body).settings.motion, motion);
  assert.ok(!calls.some(c => c.url.endsWith('/generate') || c.url.endsWith('/analyze')));
}
if (originalWindow === undefined) delete globalThis.window; else globalThis.window = originalWindow;
console.log('PASS accessible animation choices default off and autosave without any AI request');

w = wizard({ 1: refSettings, 2: [asset], 3: 1 }); tree = nodes(w.render());
calls.length = 0;
await tree.find(n => n.type === 'button' && text(n).startsWith('המשך —')).props.onClick();
await settle();
assert.equal(calls.length, 0, 'no analysis before consent');
tree = nodes(w.render());
const consent = tree.find(n => n.type === 'label' && text(n).includes('בלחיצה על המשך'));
nodes(consent).find(n => n.type === 'input').props.onChange({ target: { checked: true } });
tree = nodes(w.render());
await tree.find(n => n.type === 'button' && text(n).startsWith('המשך —')).props.onClick();
await settle();
assert.equal(calls.filter(c => c.url.endsWith('/analyze')).length, 1);
assert.equal(w.slots[3], 2);
assert.ok(w.slots[1].analysis);
console.log('PASS consent-gated analysis runs as part of Continue, then opens materials');

tree = nodes(w.render());
const aiConsent = tree.find(n => n.type === 'label' && text(n).includes('ליצירת האתר'));
nodes(aiConsent).find(n => n.type === 'input').props.onChange({ target: { checked: true } });
tree = nodes(w.render()); calls.length = 0;
await tree.find(n => n.type === 'button' && text(n) === 'יצירת האתר שלי ←').props.onClick();
await settle();
assert.equal(calls.length, 0, 'reference-only project needs explicit photo-free choice');
tree = nodes(w.render());
const noPhotos = tree.find(n => n.type === 'label' && text(n).includes('ליצור בלי תמונות'));
nodes(noPhotos).find(n => n.type === 'input').props.onChange({ target: { checked: true } });
tree = nodes(w.render());
await tree.find(n => n.type === 'button' && text(n) === 'יצירת האתר שלי ←').props.onClick();
await settle();
assert.equal(destination, `/dashboard/projects/${id}/creating?job=${jobId}`);
assert.equal(calls.filter(c => c.url.endsWith('/generate')).length, 1);
console.log('PASS missing-photo acknowledgement, saved draft, and exact-job handoff');

w = wizard({ 3: 2 }); tree = nodes(w.render()); calls.length = 0;
assert.ok(text(w.render()).includes('העלו תמונות ולוגו שבבעלותכם'));
assert.ok(!tree.some(n => n.type === 'label' && text(n).includes('הרשאה')));
await tree.find(n => n.type === 'input' && n.props.multiple).props.onChange({ target: { files: [new File(['test'], 'photo.png', { type: 'image/png' })], value: '' } });
// Upload handlers intentionally fire-and-forget; drain the bounded mock promise chain.
for (let i = 0; i < 30; i++) await new Promise(resolve => setImmediate(resolve));
assert.equal(calls.find(c => c.url.endsWith('/assets')).body.get('role'), 'hero');
assert.equal(w.slots[1].images[0].role, 'hero');
assert.ok(!calls.some(c => c.url.endsWith('/generate') || c.url.endsWith('/analyze')));
console.log('PASS business upload without rights checkbox, first photo becomes hero, no implicit AI consent');

for (const method of ['file', 'paste', 'drop']) {
  w = wizard({ 3: 1 }); tree = nodes(w.render()); calls.length = 0;
  assert.ok(text(w.render()).includes('העלו תמונה שבבעלותכם'));
  assert.ok(text(w.render()).includes('השראה לעיצוב — לא לפרסום'));
  assert.ok(!tree.some(n => n.type === 'label' && text(n).includes('הרשאה')));
  const file = new File(['test'], 'reference.png', { type: 'image/png' });
  const zone = tree.find(n => n.props?.onPaste);
  if (method === 'file') tree.find(n => n.type === 'input' && n.props.type === 'file').props.onChange({ target: { files: [file], value: '' } });
  if (method === 'paste') zone.props.onPaste({ clipboardData: { files: [file] }, preventDefault() {} });
  if (method === 'drop') zone.props.onDrop({ dataTransfer: { files: [file] }, preventDefault() {} });
  await settle();
  assert.equal(calls.find(c => c.url.endsWith('/assets')).body.get('role'), 'reference');
  assert.equal(w.slots[1].referenceAssetId, photoId);
  assert.ok(!calls.some(c => c.url.endsWith('/generate') || c.url.endsWith('/analyze')));
}
console.log('PASS reference file/paste/drop uploads without rights checkbox or implicit AI consent');

w = wizard({ 3: 2 }); tree = nodes(w.render()); calls.length = 0;
tree.find(n => n.props?.['aria-label'] === 'העלאת לוגו').props.onChange({ target: { files: [new File(['test'], 'logo.png', { type: 'image/png' })], value: '' } });
await settle();
assert.equal(calls.find(c => c.url.endsWith('/assets')).body.get('role'), 'logo');
console.log('PASS logo upload without rights checkbox');

for (const file of [new File(['bad'], 'script.svg', { type: 'image/svg+xml' }), new File([new Uint8Array(4 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' })]) {
  w = wizard({ 3: 2 }); tree = nodes(w.render()); calls.length = 0;
  tree.find(n => n.type === 'input' && n.props.multiple).props.onChange({ target: { files: [file], value: '' } });
  await settle();
  assert.equal(calls.length, 0);
  assert.ok(nodes(w.render()).some(n => n.props?.role === 'alert'));
}
console.log('PASS unsupported files and oversized images remain blocked');

const editorPlan = {
  version: 1, siteTitle: 'עסק לבדיקה', positioning: 'שירות אישי', contactCta: 'צרו קשר',
  visualDirection: { summary: 'כיוון עיצוב', palette: ['#5048e5'], typography: 'modern', layout: 'split' },
  sections: [{ id: 'hero', kind: 'hero', label: 'פתיחה', headline: 'עסק לבדיקה', body: 'תוכן קיים' }],
  seo: { title: 'עסק לבדיקה', description: 'תיאור', keywords: [] }, missingInformation: [], reviewNotes: [],
};
const documentHelpers = load('lib/sites/document.ts');
const locksHelpers = load('lib/sites/revision-locks.ts', { './document': documentHelpers });
function editor(locked = false) {
  const h = harness({ 9: { ...defaultCreationSettings(), locks: { design: locked, text: false } } });
  const { SiteWorkbench } = load('components/projects/site-workbench.tsx', {
    react: h.hooks, 'next/navigation': { useRouter: () => router },
    '@/components/sites/site-renderer': { SiteRenderer: () => null },
    './preview-viewport': { PreviewViewport: ({ children }) => children },
    '@/lib/sites/revision-locks': locksHelpers,
  });
  return { ...h, render() { h.reset(); return SiteWorkbench({ projectId: id, versionId: photoId, plan: editorPlan, versions: [], initialEditTab: 'design' }); } };
}
const motionForm = fixture => nodes(fixture.render()).find(n => n.type === 'form' && nodes(n).some(child => child.type === 'select' && child.props.name === 'motion'));
let edit = editor(), form = motionForm(edit);
assert.equal(nodes(form).find(n => n.type === 'select').props.defaultValue, 'off', 'existing versions without motion stay static');
assert.equal(nodes(form).find(n => n.type === 'fieldset').props.disabled, false);
assert.ok(!nodes(form).some(n => n.type === 'input' && n.props.type === 'checkbox'), 'non-AI change requires no AI consent');
assert.equal(nodes(motionForm(editor(true))).find(n => n.type === 'fieldset').props.disabled, true);
const uploadFetch = globalThis.fetch, nativeFormData = globalThis.FormData;
globalThis.FormData = class { constructor(target) { this.fields = target.fields; } get(key) { return this.fields[key] ?? null; } };
globalThis.fetch = async (url, init) => {
  calls.push({ url, body: init.body });
  return Response.json({ proposal: true, versionId: jobId, plan: { ...editorPlan, theme: { motion: JSON.parse(init.body).motion } } });
};
for (const motion of ['off', 'subtle', 'expressive']) {
  edit = editor(); form = motionForm(edit); calls.length = 0;
  form.props.onSubmit({ preventDefault() {}, currentTarget: { fields: { motion, headline: 'not submitted', consent: true } } });
  await settle();
  assert.equal(calls.length, 1); assert.ok(calls[0].url.endsWith('/revisions'));
  const payload = JSON.parse(calls[0].body);
  assert.deepEqual(Object.keys(payload).sort(), ['baseVersionId', 'mode', 'motion', 'requestId']);
  assert.equal(payload.mode, 'theme'); assert.equal(payload.motion, motion); assert.equal(payload.baseVersionId, photoId);
  assert.ok(nodes(edit.render()).some(n => n.props?.['aria-label'] === 'בדיקת הצעת השינוי'), 'change opens review before apply');
}
globalThis.fetch = uploadFetch; globalThis.FormData = nativeFormData;
console.log('PASS editor motion-only form needs no AI consent, respects design locks, and opens a review proposal');

const progressHarness = harness();
let pollUrl;
globalThis.fetch = async url => { pollUrl = url; return Response.json({ job: { id: jobId, state: 'completed', phase: 'done', version_id: photoId } }); };
const { GenerationProgress } = load('components/projects/generation-progress.tsx', { react: progressHarness.hooks, 'next/navigation': { useRouter: () => router }, 'next/link': ({ children, ...props }) => React.createElement('a', props, children) });
progressHarness.reset(); GenerationProgress({ projectId: id, jobId });
const cleanup = progressHarness.effects[0]();
for (let i = 0; i < 5; i++) await new Promise(resolve => setImmediate(resolve));
assert.ok(pollUrl.endsWith(`?job=${jobId}`));
assert.equal(destination, `/dashboard/projects/${id}/preview?version=${photoId}`);
cleanup();
console.log('PASS generation completion opens the exact private version preview');

destination = undefined;
globalThis.fetch = async () => Response.json({ job: { id: jobId, state: 'failed', phase: 'designing', error_message: 'נסו שוב' } });
progressHarness.reset(); GenerationProgress({ projectId: id, jobId });
const stopFailed = progressHarness.effects[0](); await settle();
assert.equal(destination, undefined);
progressHarness.reset(); assert.ok(text(GenerationProgress({ projectId: id, jobId })).includes('הטיוטה לא הושלמה'));
stopFailed();
console.log('PASS failed generation stays recoverable and never opens an unrelated preview');

let user = { id };
const filters = [];
const query = { select() { return query; }, eq(key, value) { filters.push([key, value]); return query; }, order() { return query; }, limit() { return query; }, async maybeSingle() { return { data: { id: jobId, state: 'running', expires_at: new Date(Date.now() + 60000).toISOString() } }; } };
const generationRoute = load('app/api/projects/[projectId]/generate/route.ts', {
  'server-only': {}, '@/lib/stock/snapshot': {},
  '@/lib/data/current-user': { getCurrentUser: async () => user },
  '@/lib/supabase/admin': { createAdminClient: () => ({ from: () => query }) },
  '@/lib/supabase/server': {}, '@/lib/ai/gemini': {}, '@/lib/sites/workspace-server': {}, '@/lib/creation/server': {},
});
const context = { params: Promise.resolve({ projectId: id }) };
assert.equal((await generationRoute.GET(new Request(`https://app.test/generate?job=${jobId}`), context)).status, 200);
assert.ok(filters.some(([key, value]) => key === 'project_id' && value === id));
assert.ok(filters.some(([key, value]) => key === 'actor_id' && value === id));
assert.ok(filters.some(([key, value]) => key === 'id' && value === jobId));
assert.equal((await generationRoute.GET(new Request('https://app.test/generate?job=invalid'), context)).status, 404);
user = null;
assert.equal((await generationRoute.GET(new Request('https://app.test/generate'), context)).status, 401);
console.log('PASS exact-job status endpoint retains session, project and actor scoping');

if (process.argv.includes('--serve')) {
  const { createServer } = await import('node:http');
  const css = read('components/projects/creation-wizard.module.css');
  createServer((req, res) => {
    const step = Math.max(0, Math.min(2, Number(new URL(req.url, 'http://localhost').searchParams.get('step')) || 0));
    const fixture = wizard({ 3: step });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(`<!doctype html><html lang="he" dir="rtl"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{font-family:Arial,sans-serif;background:#fafaff;margin:0;padding:24px 16px;color:#211e30}button,input,textarea{font:inherit}${css}</style><body>${renderToStaticMarkup(fixture.render())}</body></html>`);
  }).listen(4181, '127.0.0.1', () => console.log('Synthetic static layout preview: http://localhost:4181/?step=0 (steps 0–2). No auth, uploads or writes.'));
}
