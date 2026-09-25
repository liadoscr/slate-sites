// Offline behavioral checks. All authentication, storage and AI calls are mocked.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const swc = require('next/dist/build/swc');
const root = resolve(import.meta.dirname, '..');
const mocks = new Map();
const cache = new Map();
function load(path) {
  const filename = resolve(root, path);
  if (cache.has(filename)) return cache.get(filename);
  const { code } = swc.transformSync(readFileSync(filename, 'utf8'), { filename, jsc: { parser: { syntax: 'typescript' }, target: 'es2022' }, module: { type: 'commonjs' } });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(specifier => {
    if (mocks.has(specifier)) return mocks.get(specifier);
    if (specifier === 'server-only') return {};
    if (specifier.startsWith('@/')) return load(`${specifier.slice(2)}.ts`);
    if (specifier.startsWith('.')) return load(resolve(dirname(filename), `${specifier}.ts`));
    return require(specifier);
  }, module, module.exports);
  cache.set(filename, module.exports);
  return module.exports;
}

const projectId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';
const baseId = '33333333-3333-4333-8333-333333333333';
const sourceId = '44444444-4444-4444-8444-444444444444';
const requestId = '55555555-5555-4555-8555-555555555555';
const imageId = '66666666-6666-4666-8666-666666666666';
const plan = {
  version: 1, siteTitle: 'עסק לבדיקה', positioning: 'שירות אישי', contactCta: 'צרו קשר',
  visualDirection: { summary: 'כיוון פרטי', palette: ['#5048e5'], typography: 'modern', layout: 'split' },
  theme: { layout: 'split', accent: '#5048e5', font: 'modern', corners: 'soft', mode: 'light', density: 'airy' },
  sections: [
    { id: 'hero', kind: 'hero', label: 'פתיחה', headline: 'עסק לבדיקה', body: 'שירות אישי' },
    { id: 'about', kind: 'about', label: 'אודות', headline: 'על העסק', body: 'תוכן מאושר', imageId, presentation: { layout: 'split', tone: 'default' } },
    { id: 'services', kind: 'services', label: 'שירותים', headline: 'מה מציעים', body: 'מידע קיים' },
  ],
  images: [{ id: imageId, path: `${projectId}/snapshot/${imageId}`, role: 'hero', alt: 'צילום העסק', mimeType: 'image/png' }],
  business: { name: 'עסק', type: 'שירות', location: 'תל אביב', phone: '0501234567', email: 'hello@example.com', whatsapp: '972501234567' },
  seo: { title: 'עסק לבדיקה', description: 'שירות אישי', keywords: [] }, missingInformation: [], reviewNotes: [], contactPreference: 'phone',
};
let state;
function reset() {
  state = { user: { id: userId }, owner: true, locks: { design: false, text: false }, locksSequence: [], settingsReads: 0, modelCalls: 0, jobs: [], appends: [], queries: [], versions: new Map([[baseId, { id: baseId, content: structuredClone(plan), visibility: 'private' }]]) };
}
reset();

function query(table) {
  const filters = {};
  const builder = {
    select() { return builder; },
    eq(key, value) { filters[key] = value; return builder; },
    update(values) { state.jobs.push(values); return builder; },
    single() { return builder.maybeSingle(); },
    async maybeSingle() {
      state.queries.push({ table, ...filters });
      if (table === 'projects') return { data: state.owner && filters.owner_id === userId ? { id: projectId } : null };
      if (table === 'site_versions') return { data: structuredClone(state.versions.get(filters.id) ?? null) };
      throw new Error(`Unexpected table ${table}`);
    },
    then(onFulfilled, onRejected) { return Promise.resolve({ error: null }).then(onFulfilled, onRejected); },
  };
  return builder;
}
mocks.set('@/lib/data/current-user', { getCurrentUser: async () => state.user });
mocks.set('@/lib/supabase/server', { createClient: async () => ({ from: query }) });
mocks.set('@/lib/supabase/admin', { createAdminClient: () => ({ from: query, rpc: async () => ({ data: { id: requestId, claimed: true }, error: null }) }) });
mocks.set('@/lib/creation/server', { loadCreationSettings: async () => { state.settingsReads++; return { locks: state.locksSequence.shift() ?? state.locks }; } });
mocks.set('@/lib/ai/gemini', {
  rewriteSection: async section => { state.modelCalls++; return { ...section, id: 'untrusted-id', imageId: 'untrusted-image', presentation: { layout: 'band', tone: 'accent' }, headline: 'כותרת חדשה', body: 'ניסוח חדש', cta: 'צרו קשר' }; },
  redesignSection: async section => { state.modelCalls++; return { ...section, id: 'untrusted-id', headline: 'טקסט לא מורשה', imageId: 'untrusted-image', presentation: { layout: 'cards', tone: 'muted' } }; },
});
mocks.set('@/lib/sites/workspace-server', {
  selectedImages: async (_project, choices) => choices,
  snapshotImages: async (_project, _request, choices) => choices.map(choice => ({ ...choice, path: `${projectId}/snapshot/${choice.id}`, mimeType: 'image/jpeg' })),
  appendVersion: async (project, actor, content, expected, request, proposal) => {
    state.appends.push({ project, actor, content: structuredClone(content), expected, request, proposal });
    return { id: sourceId, version_number: 2, content };
  },
  workspaceError: error => ({ status: 502, error: error.message }),
});
const { POST } = load('app/api/projects/[projectId]/revisions/route.ts');
const { revisionLockError } = load('lib/sites/revision-locks.ts');
async function post(values, origin = 'http://localhost') {
  const response = await POST(new Request(`http://localhost/api/projects/${projectId}/revisions`, { method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ baseVersionId: baseId, requestId, ...values }) }), { params: Promise.resolve({ projectId }) });
  return { status: response.status, body: await response.json() };
}
let checks = 0;
async function check(label, run) { reset(); await run(); checks++; console.log(`PASS ${label}`); }

await check('origin, session and project ownership are required before settings or writes', async () => {
  assert.equal((await post({ mode: 'theme', layout: 'bento' }, 'https://other.example')).status, 403);
  state.user = null;
  assert.equal((await post({ mode: 'theme' })).status, 401);
  state.user = { id: userId }; state.owner = false;
  assert.equal((await post({ mode: 'theme' })).status, 404);
  assert.equal(state.settingsReads, 0); assert.equal(state.appends.length, 0);
});

await check('request lock flags cannot bypass saved design or text locks', async () => {
  state.locks = { design: true, text: true };
  assert.equal((await post({ mode: 'theme', layout: 'bento', locks: { design: false, text: false } })).status, 409);
  assert.equal((await post({ mode: 'section', sectionId: 'about', headline: 'חדש', body: 'חדש', locks: { design: false, text: false } })).status, 409);
  assert.equal((await post({ mode: 'seo', title: 'חדש', description: 'חדש' })).status, 409);
  assert.equal((await post({ mode: 'contact', phone: '0507654321', email: '', contactPreference: 'phone' })).status, 409);
  assert.equal(state.appends.length, 0);
});

await check('every animation mode creates a content-preserving preview with no AI request', async () => {
  state.locks.text = true;
  for (const motion of ['off', 'subtle', 'expressive']) {
    const result = await post({ mode: 'theme', motion });
    assert.equal(result.status, 200); assert.equal(result.body.proposal, true);
    assert.deepEqual(result.body.plan, { ...structuredClone(plan), theme: { ...plan.theme, motion }, revisionOf: baseId });
    const saved = state.appends.at(-1);
    assert.equal(saved.proposal, true); assert.equal(saved.expected, baseId);
    assert.equal(saved.content.theme.motion, motion);
  }
  assert.equal(state.modelCalls, 0); assert.equal(state.jobs.length, 0);
  assert.equal(state.versions.get(baseId).content.theme.motion, undefined, 'the current draft is unchanged until apply');
});

await check('invalid animation values cannot reach a saved version or trigger AI', async () => {
  for (const motion of ['spin', '', 'SUBTLE', null, true, {}, ['expressive']]) {
    assert.equal((await post({ mode: 'theme', motion })).status, 422);
  }
  assert.equal(state.appends.length, 0); assert.equal(state.modelCalls, 0); assert.equal(state.jobs.length, 0);
});

await check('animation changes honor saved and mid-request design locks', async () => {
  state.locks.design = true;
  assert.equal((await post({ mode: 'theme', motion: 'subtle', locks: { design: false } })).status, 409);
  assert.equal(state.appends.length, 0);
  state.locks.design = false;
  state.locksSequence = [{ design: false, text: false }, { design: true, text: false }];
  assert.equal((await post({ mode: 'theme', motion: 'expressive' })).status, 409);
  assert.equal(state.appends.length, 0); assert.equal(state.modelCalls, 0);
});

await check('animation proposals can be applied and restored only when design is unlocked', async () => {
  const animated = { ...structuredClone(plan), theme: { ...plan.theme, motion: 'expressive' }, revisionOf: baseId };
  state.versions.set(sourceId, { id: sourceId, visibility: 'preview', content: animated });
  state.locks.design = true;
  assert.equal((await post({ mode: 'apply', sourceVersionId: sourceId })).status, 409);
  state.locks = { design: false, text: true };
  const applied = await post({ mode: 'apply', sourceVersionId: sourceId });
  assert.equal(applied.status, 200); assert.equal(applied.body.proposal, false);
  assert.equal(applied.body.plan.theme.motion, 'expressive'); assert.equal(applied.body.plan.revisionOf, undefined);
  assert.deepEqual(applied.body.plan.sections, plan.sections);

  state.versions.set(baseId, { id: baseId, visibility: 'private', content: applied.body.plan });
  state.versions.set(sourceId, { id: sourceId, visibility: 'private', content: structuredClone(plan) });
  state.locks.design = true;
  assert.equal((await post({ mode: 'restore', sourceVersionId: sourceId })).status, 409);
  state.locks.design = false;
  const restored = await post({ mode: 'restore', sourceVersionId: sourceId });
  assert.equal(restored.status, 200); assert.equal(restored.body.proposal, false);
  assert.deepEqual(restored.body.plan, plan, 'restoring an older static version also removes animation');
  assert.equal(state.modelCalls, 0); assert.equal(state.jobs.length, 0);
});

await check('text-only AI preserves all design and unselected sections under a design lock', async () => {
  state.locks.design = true;
  const result = await post({ mode: 'rewrite', sectionId: 'about', instruction: 'קצרו את התוכן', consent: true });
  assert.equal(result.status, 200); assert.equal(result.body.proposal, true);
  const next = result.body.plan;
  assert.equal(next.sections[1].headline, 'כותרת חדשה'); assert.equal(next.sections[1].id, 'about');
  assert.equal(next.sections[1].imageId, imageId); assert.deepEqual(next.sections[1].presentation, plan.sections[1].presentation);
  assert.deepEqual(next.sections[0], plan.sections[0]); assert.deepEqual(next.sections[2], plan.sections[2]);
  assert.deepEqual(next.theme, plan.theme); assert.deepEqual(next.images, plan.images); assert.equal(next.revisionOf, baseId);
});

await check('design-only AI preserves text and asset identity under a text lock', async () => {
  state.locks.text = true;
  const result = await post({ mode: 'redesign', sectionId: 'about', instruction: 'כרטיס עם רקע עדין', consent: true });
  assert.equal(result.status, 200);
  assert.deepEqual(result.body.plan.sections[1], { ...plan.sections[1], presentation: { layout: 'cards', tone: 'muted' } });
  assert.deepEqual(result.body.plan.sections[2], plan.sections[2]); assert.deepEqual(result.body.plan.theme, plan.theme);
  assert.equal((await post({ mode: 'redesign', sectionId: 'site-header', instruction: 'שינוי פתיחה', consent: true })).status, 422);
});

await check('locked AI edits fail before calling the model and mid-flight locks prevent saving', async () => {
  state.locks.text = true;
  assert.equal((await post({ mode: 'rewrite', sectionId: 'about', instruction: 'תוכן חדש', consent: true })).status, 409);
  assert.equal(state.modelCalls, 0);
  state.locks.text = false;
  state.locksSequence = [{ design: false, text: false }, { design: false, text: true }];
  assert.equal((await post({ mode: 'rewrite', sectionId: 'about', instruction: 'תוכן חדש', consent: true })).status, 409);
  assert.equal(state.modelCalls, 1); assert.equal(state.appends.length, 0); assert.equal(state.jobs.at(-1).state, 'failed');
});

await check('legacy mixed manual requests cannot change a locked image assignment', async () => {
  state.locks.design = true;
  const result = await post({ mode: 'section', sectionId: 'about', headline: 'טקסט מותר', body: 'תוכן מותר', imageId: '' });
  assert.equal(result.status, 409); assert.equal(state.appends.length, 0);
});

await check('apply and restore compare the saved source to the locked current draft', async () => {
  state.locks.design = true;
  const changed = { ...structuredClone(plan), theme: { ...plan.theme, layout: 'bento' }, revisionOf: baseId };
  state.versions.set(sourceId, { id: sourceId, visibility: 'preview', content: changed });
  assert.equal((await post({ mode: 'apply', sourceVersionId: sourceId })).status, 409);
  state.versions.set(sourceId, { id: sourceId, visibility: 'private', content: changed });
  assert.equal((await post({ mode: 'restore', sourceVersionId: sourceId })).status, 409);
  state.locks = { design: false, text: true };
  state.versions.set(sourceId, { id: sourceId, visibility: 'private', content: { ...structuredClone(plan), siteTitle: 'שינוי נעול' } });
  assert.equal((await post({ mode: 'restore', sourceVersionId: sourceId })).status, 409);
  assert.equal(state.appends.length, 0);
});

await check('stale proposals cannot be applied and valid proposals become a new draft', async () => {
  state.versions.set(sourceId, { id: sourceId, visibility: 'preview', content: { ...structuredClone(plan), revisionOf: sourceId } });
  assert.equal((await post({ mode: 'apply', sourceVersionId: sourceId })).status, 409);
  state.versions.set(sourceId, { id: sourceId, visibility: 'preview', content: { ...structuredClone(plan), positioning: 'תיאור חדש', revisionOf: baseId } });
  const result = await post({ mode: 'apply', sourceVersionId: sourceId });
  assert.equal(result.status, 200); assert.equal(result.body.proposal, false); assert.equal(result.body.plan.revisionOf, undefined);
  assert.equal(state.appends[0].expected, baseId); assert.equal(state.appends[0].actor, userId);
});

await check('focal edits preserve stored media paths, validate coordinates and respect design locks', async () => {
  const focalPoint = { x: 12, y: 43, mobileX: 87, mobileY: 21 };
  state.locks.text = true;
  const result = await post({ mode: 'image', imageId, focalPoint, path: 'https://evil.example/image', role: 'reference' });
  assert.equal(result.status, 200); assert.deepEqual(result.body.plan.images[0], { ...plan.images[0], focalPoint });
  assert.equal((await post({ mode: 'image', imageId, focalPoint: { ...focalPoint, x: 101 } })).status, 422);
  assert.equal((await post({ mode: 'image', imageId: sourceId, focalPoint })).status, 422);
  state.locks.design = true;
  assert.equal((await post({ mode: 'image', imageId, focalPoint })).status, 409);
});

await check('alt text belongs to the text lock, while valid contact changes are previewed', async () => {
  state.locks.design = true;
  assert.equal((await post({ mode: 'image', imageId, alt: 'תיאור נגיש חדש' })).status, 200);
  state.locks.text = true;
  assert.equal((await post({ mode: 'image', imageId, alt: 'תיאור אחר' })).status, 409);
  state.locks.text = false;
  const result = await post({ mode: 'contact', phone: '0507654321', email: 'new@example.com', whatsapp: true, contactPreference: 'whatsapp' });
  assert.equal(result.status, 200); assert.equal(result.body.proposal, true); assert.equal(result.body.plan.business.whatsapp, '972507654321');
  assert.equal(result.body.plan.business.name, plan.business.name);
  assert.equal((await post({ mode: 'contact', phone: 'javascript:alert(1)', email: '', contactPreference: 'phone' })).status, 422);
  assert.equal((await post({ mode: 'contact', phone: '', email: '', contactPreference: 'whatsapp', whatsapp: true })).status, 422);
});

await check('lock comparison ignores property insertion order but protects structure and hidden templates', async () => {
  const reordered = { ...structuredClone(plan), seo: { keywords: [], description: plan.seo.description, title: plan.seo.title } };
  assert.equal(revisionLockError(plan, reordered, { design: true, text: true }), null);
  const reshuffled = { ...structuredClone(plan), sections: [...plan.sections].reverse() };
  assert.equal(revisionLockError(plan, reshuffled, { design: false, text: true }), null);
  assert.ok(revisionLockError(plan, reshuffled, { design: true, text: false }));
  assert.ok(revisionLockError(plan, { ...structuredClone(plan), template: 'another-renderer' }, { design: true, text: false }));
});

await check('stock photo replacement creates a private proposal without AI or changing other sections', async () => {
  const assetId = '77777777-7777-4777-8777-777777777777';
  const result = await post({ mode: 'replace-image', sectionId: 'site-header', assetId, alt: 'צילום אמיתי של העסק' });
  assert.equal(result.status, 200); assert.equal(result.body.proposal, true);
  assert.equal(result.body.plan.heroImageId, assetId);
  assert.equal(result.body.plan.sections[1].imageId, imageId, 'shared old image remains assigned to other section');
  assert.ok(result.body.plan.images.some(image => image.id === imageId));
  assert.ok(result.body.plan.images.some(image => image.id === assetId && !image.attribution));
  assert.deepEqual(state.versions.get(baseId).content, plan);
  assert.equal(state.modelCalls, 0);
});
await check('replacing a section image preserves a shared implicit gallery hero', async () => {
  const content = state.versions.get(baseId).content;
  delete content.heroImageId;
  content.images[0].role = 'gallery';
  const result = await post({ mode: 'replace-image', sectionId: 'about', assetId: '77777777-7777-4777-8777-777777777777', alt: 'תמונת העסק' });
  assert.equal(result.status, 200);
  assert.equal(result.body.plan.images.find(image => image.role === 'gallery').id, imageId);
  assert.equal(result.body.plan.sections[1].imageId, '77777777-7777-4777-8777-777777777777');
});
await check('replacement honors locks, validates section/asset and fences a mid-request lock', async () => {
  const values={mode:'replace-image',sectionId:'site-header',assetId:'77777777-7777-4777-8777-777777777777',alt:'תמונה'};
  for(const lock of ['design','text']) {state.locks[lock]=true; assert.equal((await post(values)).status,409);state.locks[lock]=false;}
  assert.equal((await post({...values,assetId:'invalid'})).status,422);
  assert.equal((await post({...values,sectionId:'missing'})).status,422);
  state.locksSequence=[{design:false,text:false},{design:true,text:false}];
  assert.equal((await post(values)).status,409); assert.equal(state.appends.length,0);
});
console.log(`${checks} revision checks passed. No real database writes or AI calls were made.`);
