// Read-only checks of the actual demo renderers; no browser, database writes or model calls.
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, dirname, extname } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import demos from '../lib/sites/business-demos.json' with { type: 'json' };
import orange from '../lib/sites/orange-demo.json' with { type: 'json' };
const require = createRequire(import.meta.url);
const swc = require('next/dist/build/swc');
const root = resolve(import.meta.dirname, '..');
const cache = new Map();
function load(path) {
  const file = resolve(root, path);
  if (cache.has(file)) return cache.get(file);
  if (file.endsWith('.json')) return JSON.parse(readFileSync(file, 'utf8'));
  const { code } = swc.transformSync(readFileSync(file, 'utf8'), {filename:file,jsc:{parser:{syntax:'typescript',tsx:file.endsWith('.tsx')},transform:{react:{runtime:'automatic'}},target:'es2022'},module:{type:'commonjs'}});
  const module = {exports:{}};
  new Function('require','module','exports',code)(specifier => {
    if (specifier==='next/image') return ({src,alt,...props}) => React.createElement('img',{src:typeof src==='string'?src:src.src,alt,'data-preload':props.preload?'true':undefined});
    if (specifier==='next/link') return ({children,...props}) => React.createElement('a',props,children);
    if (specifier.endsWith('.css')) return new Proxy({},{get:(_,name)=>name==='__esModule'?false:String(name)});
    if (specifier.endsWith('.png')) return {src:'/gel-orange-hero.png'};
    if (specifier.startsWith('@/') || specifier.startsWith('.')) {
      let target = specifier.startsWith('@/') ? resolve(root,specifier.slice(2)) : resolve(dirname(file),specifier);
      if (!extname(target)) target += existsSync(target+'.tsx')?'.tsx':'.ts';
      return load(target);
    }
    return require(specifier);
  },module,module.exports);
  cache.set(file,module.exports); return module.exports;
}
const { CuratedDemo } = load('components/sites/curated-demo.tsx');
const { getCuratedDemo, demoCatalog } = load('lib/sites/demo-catalog.ts');
assert.equal(demoCatalog.length, 3);
assert.equal(getCuratedDemo({template:'unknown'}), undefined);
assert.equal(getCuratedDemo({siteTitle:'ordinary AI site'}), undefined);
for (const demo of [orange,...demos]) {
  const html = renderToStaticMarkup(React.createElement(CuratedDemo,{content:demo.plan}));
  assert.equal((html.match(/<h1\b/g)||[]).length,1,`${demo.template}: one page heading`);
  assert.equal((html.match(/<main\b/g)||[]).length,1,`${demo.template}: one main landmark`);
  assert.ok(!/<form\b|<iframe\b|<input\b/.test(html), 'Demos collect no data and embed no booking/payment widgets');
  const anchors = [...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]));
  for (const [,href,label] of anchors) {
    assert.ok(!/booking|checkout|payment|calendly|stripe/i.test(href));
    assert.ok(!/קובעות תור|קביעת תור|בא לי תור|הזמנת|לרכישה|לתשלום|להזמנת/.test(label));
    if(href.startsWith('#')) assert.ok(ids.has(href.slice(1)),`Missing anchor ${href}`);
    else assert.ok(href==='/' || href==='/#examples' || href==='/auth?next=/dashboard/new',`Unexpected external action ${href}`);
  }
  for(const [,src] of html.matchAll(/<img\b[^>]*src="([^"]+)"/g)) assert.ok(existsSync(resolve(root,'public'+src)),`Missing image ${src}`);
  assert.ok(html.includes('להמחשה'));
  assert.ok(getCuratedDemo(demo.plan));
  console.log(`PASS ${demo.template}: informational copy, real anchors, local images, no booking/payment or data collection`);
}
for (const demo of demos) {
  assert.ok(statSync(resolve(root,'public'+demo.image)).size<200000,'Demo hero is under 200KB');
  assert.ok(demo.plan.business.phone==='' && demo.plan.business.email==='','No fictional contact recipient');
}
const ai = readFileSync(resolve(root,'lib/ai/gemini.ts'),'utf8');
assert.equal((ai.match(/systemInstruction: informationalScope/g)||[]).length,2,'Generation and rewrite both use informational scope');
console.log('PASS compact assets and informational-only generation/rewrite instructions');
