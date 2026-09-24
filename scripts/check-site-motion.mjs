// Offline synthetic motion checks. Never calls Supabase, Gemini, or a published site.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
const root = resolve(import.meta.dirname, '..');
const swc = require('next/dist/build/swc');
const read = path => readFileSync(resolve(root, path), 'utf8');
function load(path) {
  let filename = resolve(root, path);
  if (!existsSync(filename)) filename += existsSync(`${filename}.ts`) ? '.ts' : '.tsx';
  const { code } = swc.transformSync(readFileSync(filename, 'utf8'), { filename, jsc: { parser: { syntax: 'typescript', tsx: filename.endsWith('.tsx') }, transform: { react: { runtime: 'automatic' } }, target: 'es2022' }, module: { type: 'commonjs' } });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => {
    if (name.endsWith('.css')) return new Proxy({}, { get: (_, key) => key === '__esModule' ? false : String(key) });
    if (name.startsWith('@/')) return load(name.slice(2));
    if (name.startsWith('.')) return load(resolve(dirname(filename), name));
    return require(name);
  }, module, module.exports);
  return module.exports;
}
const { attachSiteMotion } = load('components/sites/site-motion-controller.ts');
function environment({ reduced = false, observer = true, animate = true, failObserve = false } = {}) {
  const observations = new Set(), listeners = new Map(), preferenceListeners = new Set();
  const document = { activeElement: null };
  const targets = Array.from({ length: 3 }, () => {
    const target = { animations: [], contains: element => element === target };
    if (animate) target.animate = (frames, timing) => {
      const animation = { frames, timing, cancelled: false, cancel() { this.cancelled = true; this.oncancel?.(); } };
      target.animations.push(animation);
      return animation;
    };
    return target;
  });
  const preference = { matches: reduced, addEventListener: (_, callback) => preferenceListeners.add(callback), removeEventListener: (_, callback) => preferenceListeners.delete(callback) };
  let callback, instance;
  class Observer {
    constructor(fn) { callback = fn; instance = this; }
    observe(target) { if (failObserve) throw Error('unsupported'); observations.add(target); }
    unobserve(target) { observations.delete(target); }
    disconnect() { this.disconnected = true; observations.clear(); }
  }
  document.defaultView = { matchMedia: () => preference, IntersectionObserver: observer ? Observer : undefined };
  const host = { ownerDocument: document, querySelectorAll: () => targets, addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name) };
  return { host, targets, observations, listeners, preferenceListeners, get observer() { return instance; },
    emit(target, isIntersecting, intersectionRect = { width: 100, height: 100 }) { callback([{ target, isIntersecting, intersectionRect }]); },
    initial() { targets.forEach((target, index) => callback([{ target, isIntersecting: index === 0, intersectionRect: { width: index === 0 ? 100 : 0, height: index === 0 ? 100 : 0 } }])); },
    focus(target) { document.activeElement = target; listeners.get('focusin')?.(); },
    reduce() { preference.matches = true; for (const fn of preferenceListeners) fn(); },
  };
}

for (const configuration of [{ level: 'off' }, { reduced: true }, { observer: false }]) {
  const env = environment(configuration);
  attachSiteMotion(env.host, configuration.level ?? 'subtle')();
  assert.equal(env.observer, undefined);
  assert.equal(env.targets.flatMap(t => t.animations).length, 0);
}
console.log('PASS off, initial reduced-motion, and unsupported observer leave content untouched');

for (const [level, duration, distance] of [['subtle', 420, 12], ['expressive', 600, 24]]) {
  const env = environment();
  const dispose = attachSiteMotion(env.host, level);
  env.initial();
  assert.equal(env.targets[0].animations.length, 0, 'initially visible content never animates');
  assert.equal(env.observations.has(env.targets[0]), false);
  env.emit(env.targets[1], true);
  assert.equal(env.targets[1].animations.length, 1);
  const animation = env.targets[1].animations[0];
  assert.equal(animation.timing.duration, duration);
  assert.equal(animation.frames[0].transform, `translateY(${distance}px)`);
  assert.equal(animation.timing.fill, 'none', 'no retained hidden state after finish');
  env.emit(env.targets[1], false); env.emit(env.targets[1], true);
  assert.equal(env.targets[1].animations.length, 1, 'scrolling back cannot replay a reveal');
  dispose();
  assert.ok(animation.cancelled);
  assert.equal(env.observations.size, 0);
  assert.equal(env.listeners.size, 0);
  assert.equal(env.preferenceListeners.size, 0);
}
console.log('PASS bounded one-time subtle/expressive reveals and complete cleanup');

let env = environment();
attachSiteMotion(env.host, 'subtle');
env.emit(env.targets[1], true, { width: 100, height: 0 });
assert.equal(env.observations.has(env.targets[1]), true, 'edge-only intersection is not already visible');
env.emit(env.targets[1], true, { width: 100, height: 0 });
assert.equal(env.targets[1].animations.length, 0);
env.emit(env.targets[1], true);
assert.equal(env.targets[1].animations.length, 1);
console.log('PASS zero-area/clipped initial intersections remain eligible until visible');

env = environment();
attachSiteMotion(env.host, 'expressive'); env.initial();
env.emit(env.targets[1], true); env.focus(env.targets[1]);
assert.ok(env.targets[1].animations[0].cancelled, 'focused content becomes immediately visible');
env.focus(env.targets[2]); env.emit(env.targets[2], true);
assert.equal(env.targets[2].animations.length, 0, 'a focused offscreen target never starts hidden');
env.reduce();
assert.ok(env.observer.disconnected);
assert.equal(env.listeners.size, 0);
assert.equal(env.preferenceListeners.size, 0);

env = environment(); attachSiteMotion(env.host, 'subtle'); env.initial(); env.emit(env.targets[1], true); env.reduce();
assert.ok(env.targets[1].animations[0].cancelled, 'runtime reduced-motion cancels an active animation');
env.emit(env.targets[2], true);
assert.equal(env.targets[2].animations.length, 0);
console.log('PASS focus and runtime reduced-motion immediately cancel effects');

env = environment({ animate: false }); attachSiteMotion(env.host, 'subtle'); env.initial(); env.emit(env.targets[1], true);
assert.equal(env.targets[1].animations.length, 0);
env = environment({ failObserve: true }); attachSiteMotion(env.host, 'subtle');
assert.ok(env.observer.disconnected);
assert.equal(env.listeners.size, 0);
console.log('PASS unsupported animation and failed enhancement fail open');

const { SiteRenderer } = load('components/sites/site-renderer.tsx');
const plan = {
  version: 1, siteTitle: 'עסק עם תנועה עדינה', positioning: 'דוגמה לבדיקה מקומית בלבד', contactCta: 'דברו איתנו',
  visualDirection: { summary: '', palette: [], typography: '', layout: '' },
  sections: Array.from({ length: 5 }, (_, index) => ({ id: `test-${index}`, kind: 'about', label: `פרק ${index + 1}`, headline: 'תוכן שנשאר נגיש', body: 'העיצוב נע פעם אחת כשמגיעים אליו. התוכן זמין גם ללא JavaScript ובהעדפה להפחתת תנועה.', presentation: { layout: index % 2 ? 'cards' : 'band', tone: 'muted' } })),
  seo: { title: 'Motion test', description: '', keywords: [] }, missingInformation: [], reviewNotes: [],
};
const render = (motion = 'subtle', layout = 'bento') => renderToStaticMarkup(React.createElement(SiteRenderer, { plan: { ...plan, theme: { layout, accent: '#5048e5', font: 'modern', corners: 'soft', motion } }, projectId: 'synthetic', versionId: 'synthetic' }));
for (const motion of ['off', 'subtle', 'expressive']) {
  const html = render(motion);
  assert.ok(html.includes(`data-motion="${motion}"`));
  assert.ok(!html.match(/<(?:section|figure)[^>]*(?:hidden|opacity:0)/));
  const heroTag = html.match(/<section[^>]*id="site-top"[^>]*>/)?.[0];
  assert.ok(heroTag && !heroTag.includes('data-site-reveal'), 'hero/LCP content is not a reveal target');
  assert.ok(html.includes('class="sections"><section'), 'grid section children are not wrapped');
}
const css = read('components/sites/site-renderer.module.css');
assert.match(css, /prefers-reduced-motion:reduce/);
assert.match(css, /\[data-site-reveal\]:focus-within\s*\{\s*opacity:1 !important/);
console.log('PASS SSR/no-JS visible content, untouched hero, unchanged grid structure, CSS accessibility fallbacks');

if (process.argv.includes('--serve')) {
  const { createServer } = await import('node:http');
  const port = Number(process.argv.find(arg => arg.startsWith('--port='))?.split('=')[1] ?? 4182);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid fixture port');
  const browserCode = swc.transformSync(read('components/sites/site-motion-controller.ts'), { filename: 'site-motion-controller.ts', jsc: { parser: { syntax: 'typescript' }, target: 'es2022' }, module: { type: 'es6' } }).code;
  const server = createServer((request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1:4182');
    const level = ['off', 'subtle', 'expressive'].includes(url.searchParams.get('motion')) ? url.searchParams.get('motion') : 'subtle';
    const nested = url.searchParams.get('nested') === '1';
    const html = `<!doctype html><html lang="he" dir="rtl"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Synthetic site-motion check</title><style>body{margin:0;font-family:Arial,sans-serif;background:#e9e9ed}.fixture-nav{padding:20px;background:white;display:flex;flex-wrap:wrap;gap:24px}.fixture-nav a{color:#352fc2}.fixture-frame{${nested ? 'height:520px;max-width:800px;overflow:auto;margin:30px auto;border:3px solid #ccc;' : ''}}${css}</style><nav class="fixture-nav"><a href="?motion=off&nested=${nested ? 1 : 0}">Off</a><a href="?motion=subtle&nested=${nested ? 1 : 0}">Subtle</a><a href="?motion=expressive&nested=${nested ? 1 : 0}">Expressive</a><a href="?motion=${level}&nested=${nested ? 0 : 1}">Toggle nested preview</a></nav><div class="fixture-frame">${render(level)}</div><script type="module">${browserCode}
// Fixture-only DOM counters make completed one-time animations inspectable in browser QA.
document.querySelectorAll('[data-site-reveal]').forEach(element => {
  const animate = element.animate.bind(element);
  element.dataset.revealCount = '0';
  element.animate = (...args) => {
    element.dataset.revealCount = String(Number(element.dataset.revealCount) + 1);
    return animate(...args);
  };
});
window.disposeSiteMotion=attachSiteMotion(document.querySelector('article'), ${JSON.stringify(level)});</script></html>`;
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(html);
  });
  server.listen(port, '127.0.0.1', () => console.log(`Synthetic scroll fixture at http://127.0.0.1:${port}/?motion=expressive&nested=1 (no live data)`));
}
