// Synthetic UI behavior checks: no Supabase, Pexels, or Gemini requests.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
const require = createRequire(import.meta.url);
const read = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
function load(file, mocks = {}) {
  const { code } = require('next/dist/build/swc').transformSync(read(file), { filename: file, jsc: { parser: { syntax: 'typescript', tsx: true }, target: 'es2022', transform: { react: { runtime: 'automatic' } } }, module: { type: 'commonjs' } });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => {
    if (name in mocks) return mocks[name];
    if (name.endsWith('.css')) return new Proxy({}, { get: (_, key) => key === '__esModule' ? false : String(key) });
    if (name.startsWith('@/')) return load(`${name.slice(2)}.ts`, mocks);
    return require(name);
  }, module, module.exports);
  return module.exports;
}
const nodes = tree => !tree || typeof tree !== 'object' ? [] : [tree, ...React.Children.toArray(tree.props?.children).flatMap(nodes)];
const text = tree => typeof tree === 'string' ? tree : typeof tree === 'number' ? String(tree) : !tree ? '' : React.Children.toArray(tree.props?.children).map(text).join('');
const userId = '00000000-0000-4000-8000-000000000001';
const jobId = '00000000-0000-4000-8000-000000000002';
const story = 'אנחנו קצבייה משפחתית בחיפה שמציעה בשר טרי ונתחים איכותיים לבישול ולמנגל.';
const storage = new Map();
globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
const calls = [];
let destination = '', failureAt = '', holdFirst = null;
globalThis.fetch = async (url, init) => {
  calls.push({ url, method: init.method, body: JSON.parse(init.body) });
  if (holdFirst && calls.length === 1) await holdFirst;
  if (failureAt && url.endsWith(failureAt)) return Response.json({ error: 'תקלה לבדיקה. נסו שוב. (קוד תקלה: test-only)' }, { status: 500 });
  return Response.json(url.endsWith('/generate') ? { jobId } : {});
};
function form(props = {}) {
  const slots = [], effects = [];
  let cursor = 0;
  const hooks = { ...React,
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial; return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }]; },
    useRef(initial) { const index = cursor++; if (!(index in slots)) slots[index] = { current: initial }; return slots[index]; },
    useEffect(callback) { effects.push(callback); },
  };
  const { QuickStartForm } = load('components/projects/quick-start-form.tsx', { react: hooks, 'next/navigation': { useRouter: () => ({ replace: url => { destination = url; }, refresh() {} }) } });
  const instance = {
    slots,
    render() { cursor = 0; effects.length = 0; return QuickStartForm({ userId, stockPhotosAvailable: true, ...props }); },
    input(id, value) { nodes(instance.render()).find(node => node.props?.id === id).props.onChange({ target: { value } }); },
    consent() { nodes(instance.render()).find(node => node.type === 'input' && node.props.type === 'checkbox').props.onChange({ target: { checked: true } }); },
    submit() { return instance.render().props.onSubmit({ preventDefault() {} }); },
  };
  instance.render(); effects[0]();
  return instance;
}
function reset() { storage.clear(); calls.length = 0; failureAt = ''; destination = ''; holdFirst = null; }

reset(); let f = form();
assert.equal(calls.length, 0);
assert.equal(nodes(f.render()).filter(node => node.type === 'input' && ['tel', 'email', 'file'].includes(node.props.type)).length, 0);
assert.ok(text(f.render()).includes('Google Gemini'));
assert.ok(text(f.render()).includes('Pexels'));
assert.ok(text(f.render()).includes('להמחשה'));
f.input('quick-business-description', 'קצר'); f.consent(); await f.submit();
assert.equal(calls.length, 0);
assert.ok(text(f.render()).includes('30 תווים לפחות'));
reset(); f = form(); f.input('quick-business-description', story); await f.submit();
assert.equal(calls.length, 0, 'explicit consent is required');
console.log('PASS short description form, no contact/upload inputs, provider disclosure and consent gate');

reset(); f = form({ stockPhotosAvailable: false }); f.input('quick-business-description', story); f.consent(); await f.submit();
assert.equal(calls.length, 0);
assert.equal(nodes(f.render()).find(node => node.props?.type === 'submit').props.disabled, true);
assert.ok(text(f.render()).includes('עדיין לא הוגדרה'));
console.log('PASS missing stock configuration disables automatic creation without discarding entered text');

reset(); f = form(); f.input('quick-business-description', story); f.consent(); await f.submit();
assert.deepEqual(calls.map(call => call.method), ['POST', 'PUT', 'POST']);
assert.equal(calls[0].body.businessName, 'העסק שלי');
assert.equal(calls[0].body.businessStory, story);
for (const field of ['contactPhone', 'contactEmail', 'location']) assert.equal(calls[0].body[field], '');
assert.equal(calls[1].body.settings.creationMode, 'automatic');
assert.equal(calls[1].body.settings.imageSource, 'stock');
assert.equal(calls[1].body.settings.contactPreference, 'form');
assert.equal(calls[2].body.consent, true);
assert.equal(destination, `/dashboard/projects/${calls[0].body.projectId}/creating?job=${jobId}`);
assert.equal(storage.size, 0, 'completed local draft removed after successful handoff');
console.log('PASS brief → automatic stock settings → generation → exact private job route');

reset(); failureAt = '/generate'; f = form(); f.input('quick-business-description', story); f.consent(); await f.submit();
const first = { projectId: calls[0].body.projectId, requestId: calls[2].body.requestId };
assert.ok(text(f.render()).includes('test-only'));
assert.equal(nodes(f.render()).find(node => node.props?.id === 'quick-business-description').props.value, story);
const cached = JSON.parse(storage.get(`slate-quick-start:${userId}:new`));
assert.equal(cached.projectId, first.projectId); assert.equal(cached.requestId, first.requestId);
assert.ok(!('consent' in cached), 'consent must not be restored automatically');
await f.submit();
assert.equal(calls[3].body.projectId, first.projectId); assert.equal(calls[5].body.requestId, first.requestId);
f = form();
assert.equal(nodes(f.render()).find(node => node.props?.id === 'quick-business-description').props.value, story);
assert.equal(nodes(f.render()).find(node => node.props?.type === 'checkbox').props.checked, false);
f.consent(); await f.submit(); assert.equal(calls[8].body.requestId, first.requestId);
f.input('quick-business-description', `${story} אנחנו עסק מקומי.`); await f.submit();
assert.notEqual(calls[11].body.requestId, first.requestId); assert.equal(calls[9].body.projectId, first.projectId);
const other = form({ userId: '00000000-0000-4000-8000-000000000003' });
assert.equal(nodes(other.render()).find(node => node.props?.id === 'quick-business-description').props.value, '');
console.log('PASS failed submit keeps fields/code, stable project and request IDs survive retry/reload; changed draft renews request; user-isolated draft');

for (const endpoint of ['/brief', '/creation']) {
  reset(); failureAt = endpoint; f = form(); f.input('quick-business-description', story); f.consent(); await f.submit();
  assert.ok(!calls.some(call => call.url.endsWith('/generate')));
  assert.equal(destination, '');
  assert.equal(nodes(f.render()).find(node => node.props?.id === 'quick-business-description').props.value, story);
}
console.log('PASS generation never starts after a failed brief/settings save');

reset(); let release;
holdFirst = new Promise(resolve => { release = resolve; });
const busyStates = []; f = form({ onBusyChange: busy => busyStates.push(busy) });
f.input('quick-business-description', story); f.consent(); const pending = f.submit(); await f.submit();
assert.equal(calls.length, 1, 'synchronous double-click guard');
assert.equal(nodes(f.render()).find(node => node.type === 'fieldset').props.disabled, true);
release(); await pending;
assert.equal(calls.filter(call => call.url.endsWith('/generate')).length, 1);
assert.deepEqual(busyStates, [true], 'keep interactions disabled until navigation');
console.log('PASS double submission prevented while saving/generating');

const wrapperSource = read('components/projects/new-project-brief-form.tsx');
assert.ok(wrapperSource.includes('slate-creation:${userId}:new'));
assert.ok(wrapperSource.includes("hidden={mode !== 'guided'}"));
assert.ok(wrapperSource.includes('<CreationWizard userId={userId}'));
console.log('PASS guided wizard remains available and mounted across creation-mode switches');

if (process.argv.includes('--serve')) {
  const { createServer } = await import('node:http');
  const { renderToStaticMarkup } = await import('react-dom/server');
  createServer((request,response) => {
    reset();
    const configured = new URL(request.url,'http://localhost').searchParams.get('configured') !== '0';
    const fixture = form({stockPhotosAvailable:configured});
    response.setHeader('Content-Type','text/html; charset=utf-8');
    response.end(`<!doctype html><html lang="he" dir="rtl"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{font-family:Arial,sans-serif;background:#fafaff;color:#211e30;margin:0;padding:24px 16px}button,input,textarea{font:inherit}${read('components/projects/quick-start-form.module.css')}</style><body><main class="wrapper">${renderToStaticMarkup(fixture.render())}</main></body></html>`);
  }).listen(4185,'127.0.0.1',()=>console.log('Static synthetic quick-start layout: http://127.0.0.1:4185/ (?configured=0 for missing key). No live requests.'));
}
