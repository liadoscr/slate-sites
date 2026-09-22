// Offline component checks. Authentication is mocked; no real session is revoked.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const require = createRequire(import.meta.url);
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
function load(path, mocks = {}) {
  const { code } = require('next/dist/build/swc').transformSync(read(path), {
    filename: path, jsc: { parser: { syntax: 'typescript', tsx: true }, transform: { react: { runtime: 'automatic' } }, target: 'es2022' }, module: { type: 'commonjs' },
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => {
    if (name in mocks) return mocks[name];
    if (name.endsWith('.css')) return new Proxy({}, { get: (_, key) => key === '__esModule' ? false : String(key) });
    return require(name);
  }, module, module.exports);
  return module.exports;
}
const { PageLoader } = load('components/ui/page-loader.tsx');
const html = renderToStaticMarkup(React.createElement(PageLoader));
assert.ok(html.includes('role="status"'));
assert.ok(html.includes('slate'));
assert.ok(html.includes('Loading'));
assert.match(read('components/ui/page-loader.module.css'), /prefers-reduced-motion: reduce/);
for (const route of ['app/loading.tsx', 'app/dashboard/loading.tsx']) assert.ok(read(route).includes('<PageLoader />'));
console.log('PASS branded route loading and reduced-motion support');

const nodes = tree => !tree || typeof tree !== 'object' ? [] : [tree, ...React.Children.toArray(tree.props?.children).flatMap(nodes)];
for (const locale of ['he', 'en']) {
  let cursor = 0, calls = 0, finish, destination;
  const slots = [];
  const hooks = { ...React,
    useState(initial) { const slot = cursor++; if (!(slot in slots)) slots[slot] = initial; return [slots[slot], value => { slots[slot] = value; }]; },
    useRef(initial) { const slot = cursor++; if (!(slot in slots)) slots[slot] = { current: initial }; return slots[slot]; },
  };
  globalThis.window = { location: { replace(url) { destination = url; } } };
  const { LogoutButton } = load('components/auth/logout-button.tsx', {
    react: hooks,
    '@/lib/supabase/client': { createClient: () => ({ auth: { signOut(options) {
      assert.equal(options.scope, 'local'); calls++;
      return new Promise(resolve => { finish = resolve; });
    } } }) },
  });
  const render = () => { cursor = 0; return nodes(LogoutButton({ locale })); };
  let tree = render();
  const click = tree.find(node => node.type === 'button').props.onClick;
  const attempt = click();
  await click();
  assert.equal(calls, 1, 'duplicate clicks cannot revoke twice');
  tree = render();
  assert.equal(tree.find(node => node.type === 'button').props.disabled, true);
  finish({ error: new Error('Network unavailable') }); await attempt;
  tree = render();
  assert.ok(tree.some(node => node.props.role === 'alert'));
  assert.equal(destination, undefined, 'failed sign-out must not pretend to succeed');
  assert.equal(tree.find(node => node.type === 'button').props.disabled, false);
  const retry = tree.find(node => node.type === 'button').props.onClick();
  finish({ error: null }); await retry;
  assert.equal(destination, locale === 'en' ? '/?lang=en' : '/');
}
console.log('PASS logout scope, pending state, duplicate prevention, failure/retry, and HE/EN fresh navigation');

const { MarketingHeader } = load('components/home/marketing-header.tsx', {
  'next/link': ({ children, ...props }) => React.createElement('a', props, children),
  '@/components/auth/logout-button': { LogoutButton: () => React.createElement('button', null, 'Logout fixture') },
});
for (const isSignedIn of [false, true]) {
  const header = renderToStaticMarkup(React.createElement(MarketingHeader, { locale: 'he', accountHref: '/dashboard', isSignedIn, showDemos: true }));
  assert.equal((header.match(/Logout fixture/g) || []).length, isSignedIn ? 2 : 0);
}
for (const path of ['app/dashboard/page.tsx', 'app/dashboard/new/page.tsx', 'app/dashboard/projects/[projectId]/page.tsx', 'app/dashboard/projects/[projectId]/edit/page.tsx']) {
  assert.ok(read(path).includes('<WorkspaceHeader'));
}
console.log('PASS logout in signed-in desktop/mobile menus and workspace headers');
