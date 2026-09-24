// Synthetic DOM checks only. No network, model calls, or customer-data writes.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const source=readFileSync(new URL('../components/sites/demo-motion-controller.ts',import.meta.url),'utf8');
const {code}=require('next/dist/build/swc').transformSync(source,{filename:'demo-motion-controller.ts',jsc:{parser:{syntax:'typescript'},target:'es2022'},module:{type:'commonjs'}});
const module={exports:{}};
new Function('module','exports',code)(module,module.exports);
const {attachDemoMotion}=module.exports;
function environment({reduced=false,mobile=false,unsupported=false}={}) {
  const events=new Map(), preferences=new Map(), frames=new Map();
  const media=(matches,key)=>({matches,addEventListener:(_,fn)=>preferences.set(key,fn),removeEventListener:()=>preferences.delete(key)});
  const reduce=media(reduced,'reduce'), small=media(mobile,'small');
  let callback, disconnected=false, frameId=0;
  const observed=new Set();
  const document={activeElement:null};
  const targets=['line','image','card'].map((kind,index)=>{
    const target={dataset:{demoEnter:kind,demoOrder:String(index)},animations:[],contains:element=>element===target};
    target.animate=(frames,timing)=>{const animation={frames,timing,cancelled:false,cancel(){this.cancelled=true;this.oncancel?.();}};target.animations.push(animation);return animation;};
    return target;
  });
  const drift={style:{removeProperty(key){delete this[key];}},getBoundingClientRect:()=>({top:100,bottom:500,height:400})};
  const view={innerHeight:800,matchMedia:query=>query.includes('reduced-motion')?reduce:small,
    IntersectionObserver:unsupported?undefined:class {constructor(fn){callback=fn;}observe(e){observed.add(e);}unobserve(e){observed.delete(e);}disconnect(){observed.clear();disconnected=true;}},
    requestAnimationFrame:fn=>{frames.set(++frameId,fn);return frameId;},cancelAnimationFrame:id=>frames.delete(id),
    addEventListener:(type,fn)=>events.set(type,fn),removeEventListener:type=>events.delete(type)};
  document.defaultView=view;
  const root={ownerDocument:document,querySelectorAll:()=>targets,querySelector:()=>drift,addEventListener:(type,fn)=>events.set(type,fn),removeEventListener:type=>events.delete(type)};
  return {root,targets,observed,events,preferences,drift,frames,get disconnected(){return disconnected;},
    show(){callback(targets.map(target=>({target,isIntersecting:true,intersectionRect:{width:100,height:100}})));},
    focus(target){document.activeElement=target;events.get('focusin')?.();},
    reduce(){reduce.matches=true;preferences.get('reduce')?.();},
    resize(){small.matches=true;preferences.get('small')?.();},
    tick(){for(const [id,fn] of frames){frames.delete(id);fn();}}};
}
for(const configuration of [{reduced:true},{unsupported:true}]) {
  const env=environment(configuration);attachDemoMotion(env.root,'orange')();
  assert.equal(env.observed.size,0);assert.equal(env.events.size,0);
}
for(const style of ['orange','forma','move']) {
  const env=environment(); const dispose=attachDemoMotion(env.root,style);
  env.show();env.tick();
  assert.ok(env.targets.every(t=>t.animations.length===1),'Visible hero elements animate immediately');
  assert.equal(env.targets[0].animations[0].frames[0].opacity,.25,'Headline remains painted');
  assert.equal(env.targets[1].animations[0].frames[0].opacity,undefined,'LCP image is never faded out');
  assert.ok(env.targets[2].animations[0].timing.delay>0,'Cards stagger');
  if(style==='forma') assert.ok(env.targets[1].animations[0].frames[0].clipPath);
  if(style==='orange') assert.match(env.targets[2].animations[0].frames[0].transform,/rotate/);
  if(style==='move') assert.match(env.targets[2].animations[0].frames[0].transform,/translateX/);
  env.show();assert.ok(env.targets.every(t=>t.animations.length===1),'Reveals run once');
  assert.ok(env.drift.style.translate,'Desktop scroll composition is enhanced');
  env.resize();env.tick();assert.equal(env.drift.style.translate,undefined,'Mobile clears desktop drift');
  env.focus(env.targets[2]);assert.ok(env.targets[2].animations[0].cancelled,'Focus cancels even delayed effects');
  env.reduce();assert.ok(env.targets.every(t=>t.animations[0].cancelled));
  assert.ok(env.disconnected);assert.equal(env.events.size,0);assert.equal(env.preferences.size,0);assert.equal(env.frames.size,0);
  dispose();
}
const mobile=environment({mobile:true});attachDemoMotion(mobile.root,'move');mobile.show();mobile.tick();
assert.equal(mobile.targets[0].animations[0].timing.duration,540);
assert.ok(!mobile.targets[0].animations[0].frames[0].transform.includes('skew'));
assert.equal(mobile.drift.style.translate,undefined);
const failure=environment(); failure.targets[0].animate=()=>{throw Error('unsupported');};
attachDemoMotion(failure.root,'forma');assert.doesNotThrow(()=>failure.show());
assert.equal(failure.targets[1].animations.length,1);
console.log('PASS distinct demo choreography, immediate hero entrances, staggered cards, bounded desktop drift, simplified mobile, focus/reduced-motion cancellation, one-time playback and cleanup');
