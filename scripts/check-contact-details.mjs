// Offline endpoint checks: all database, authentication and AI access is mocked.
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
const proposalId = '44444444-4444-4444-8444-444444444444';
const requestId = '55555555-5555-4555-8555-555555555555';
const plan = {
  version: 1, siteTitle: 'עיצוב בגישה אישית', positioning: 'סטודיו קטן לעיצוב', contactCta: 'צרו קשר',
  visualDirection: { summary: 'צבעים חמים', palette: ['#5048e5'], typography: 'modern', layout: 'split' },
  sections: [{ id: 'about', kind: 'about', label: 'אודות', headline: 'על הסטודיו', body: 'תוכן מאושר' }],
  business: { name: 'הסטודיו שלי', type: 'סטודיו לעיצוב', location: '', phone: '', email: '', whatsapp: '' },
  seo: { title: 'הסטודיו שלי', description: 'עיצוב אישי', keywords: [] }, missingInformation: [], reviewNotes: [], contactPreference: 'form',
};
let state;
function reset() {
  state = { locks: { design: false, text: false }, locksSequence: [], appends: [], versions: new Map([[baseId, { id: baseId, content: structuredClone(plan), visibility: 'private' }]]) };
}
reset();

function query(table) {
  const filters = {};
  const builder = {
    select() { return builder; }, eq(key, value) { filters[key] = value; return builder; },
    single() { return builder.maybeSingle(); },
    async maybeSingle() {
      assert.equal(filters.id === projectId || filters.project_id === projectId, true);
      if (table === 'projects') { assert.equal(filters.owner_id, userId); return { data: { id: projectId } }; }
      if (table === 'site_versions') return { data: structuredClone(state.versions.get(filters.id) ?? null) };
      throw new Error(`Unexpected table access: ${table}`);
    },
  };
  return builder;
}
mocks.set('@/lib/data/current-user', { getCurrentUser: async () => ({ id: userId }) });
mocks.set('@/lib/supabase/server', { createClient: async () => ({ from: query }) });
mocks.set('@/lib/supabase/admin', { createAdminClient: () => { throw new Error('Details revisions must not mutate the project or use AI jobs.'); } });
mocks.set('@/lib/creation/server', { loadCreationSettings: async () => ({ locks: state.locksSequence.shift() ?? state.locks }) });
mocks.set('@/lib/ai/gemini', {
  rewriteSection: async () => { throw new Error('Unexpected AI request.'); },
  redesignSection: async () => { throw new Error('Unexpected AI request.'); },
});
mocks.set('@/lib/sites/workspace-server', {
  appendVersion: async (project, actor, content, expected, request, proposal) => {
    state.appends.push({ project, actor, content: structuredClone(content), expected, request, proposal });
    return { id: proposalId, version_number: 2, content };
  },
  workspaceError: error => ({ status: 502, error: error.message }),
});
const { POST } = load('app/api/projects/[projectId]/revisions/route.ts');
async function post(values = {}) {
  const response = await POST(new Request(`http://localhost/api/projects/${projectId}/revisions`, {
    method: 'POST', headers: { origin: 'http://localhost', 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'contact', baseVersionId: baseId, requestId, phone: '', email: '', contactPreference: 'form', ...values }),
  }), { params: Promise.resolve({ projectId }) });
  return { status: response.status, body: await response.json() };
}
let checks = 0;
async function check(label, run) { reset(); await run(); checks++; console.log(`PASS ${label}`); }

await check('new business details are previewed without changing existing copy or saved versions', async () => {
  const result = await post({ businessName: '  סטודיו נעמה  ', location: ' הרצל 12, תל אביב ', phone: '050-1234567', email: 'studio@example.com', whatsapp: true, contactPreference: 'whatsapp' });
  assert.equal(result.status, 200); assert.equal(result.body.proposal, true);
  assert.deepEqual(result.body.plan, {
    ...plan, business: { ...plan.business, name: 'סטודיו נעמה', location: 'הרצל 12, תל אביב', phone: '0501234567', email: 'studio@example.com', whatsapp: '972501234567' }, contactPreference: 'whatsapp', revisionOf: baseId,
  });
  assert.deepEqual(state.versions.get(baseId).content, plan);
  assert.equal(state.appends[0].proposal, true); assert.equal(state.appends[0].expected, baseId);
});

await check('legacy contact requests preserve saved business name and location', async () => {
  const base = state.versions.get(baseId).content;
  base.business.location = 'חיפה';
  const result = await post({ phone: '0501234567', contactPreference: 'phone' });
  assert.equal(result.status, 200);
  assert.equal(result.body.plan.business.name, base.business.name);
  assert.equal(result.body.plan.business.location, 'חיפה');
});

await check('partial details and blank contact fields remain valid for form-based drafts', async () => {
  assert.equal((await post({ businessName: 'העסק שלי' })).status, 200);
  const result = await post({ location: '' });
  assert.equal(result.status, 200); assert.equal(result.body.plan.business.name, plan.business.name);
  assert.equal(result.body.plan.business.phone, ''); assert.equal(result.body.plan.business.email, '');
});

await check('invalid names, locations and contact targets cannot create a version', async () => {
  for (const businessName of ['', ' ', 'א', '--', '😀', null, 15, {}, 'א'.repeat(121)]) assert.equal((await post({ businessName })).status, 422);
  for (const location of [null, 15, {}, 'א'.repeat(121)]) assert.equal((await post({ location })).status, 422);
  for (const contactPreference of ['phone', 'email', 'whatsapp']) assert.equal((await post({ businessName: 'העסק שלי', contactPreference })).status, 422);
  assert.equal(state.appends.length, 0);
  assert.equal((await post({ businessName: 'א'.repeat(120), location: 'ב'.repeat(120) })).status, 200);
});

await check('details respect initial and mid-request text locks, while design locks allow them', async () => {
  state.locks.text = true;
  assert.equal((await post({ businessName: 'עסק חדש' })).status, 409);
  state.locks.text = false;
  state.locksSequence = [{ design: false, text: false }, { design: false, text: true }];
  assert.equal((await post({ location: 'תל אביב' })).status, 409);
  assert.equal(state.appends.length, 0);
  state.locks.design = true;
  assert.equal((await post({ businessName: 'עסק חדש', location: 'תל אביב' })).status, 200);
});

await check('details proposals require apply to become a draft and remain guarded by text locks', async () => {
  const proposed = await post({ businessName: 'שם מאושר', location: 'רחוב הגפן 5' });
  state.versions.set(proposalId, { id: proposalId, content: proposed.body.plan, visibility: 'preview' });
  state.locks.text = true;
  assert.equal((await post({ mode: 'apply', sourceVersionId: proposalId })).status, 409);
  state.locks.text = false;
  const applied = await post({ mode: 'apply', sourceVersionId: proposalId });
  assert.equal(applied.status, 200); assert.equal(applied.body.proposal, false);
  assert.equal(applied.body.plan.revisionOf, undefined); assert.equal(applied.body.plan.business.name, 'שם מאושר');
  assert.deepEqual(applied.body.plan.sections, plan.sections);
});

console.log(`${checks} contact-detail checks passed. No real database writes or AI calls were made.`);
