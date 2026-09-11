// Focused component/geometry checks, not a browser or device simulation.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import demos from '../lib/sites/business-demos.json' with {type:'json'};
const require=createRequire(import.meta.url);
const source=readFileSync(new URL('../components/home/demo-carousel.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../components/home/demo-carousel.module.css',import.meta.url),'utf8');
const {code}=require('next/dist/build/swc').transformSync(source,{filename:'demo-carousel.tsx',jsc:{parser:{syntax:'typescript',tsx:true},transform:{react:{runtime:'automatic'}},target:'es2022'},module:{type:'commonjs'}});
const fixtures=[{projectId:'orange',template:'orange-gel-v1',name:'ORANGE.GEL',category:'ציפורניים',image:'/gel-orange-hero.png',imageAlt:'Orange'},...demos];
function component(react) {
  const module={exports:{}};
  new Function('require','module','exports',code)(name=>{
    if(name==='react')return react;
    if(name==='next/image')return ({src,alt})=>React.createElement('img',{src,alt});
    if(name==='next/link')return ({children,...props})=>React.createElement('a',props,children);
    if(name.endsWith('.css'))return new Proxy({},{get:(_,key)=>key==='__esModule'?false:String(key)});
    return require(name);
  },module,module.exports);
  return module.exports.DemoCarousel;
}
const Carousel=component(React);
for(const count of [0,1,3]) {
  const html=renderToStaticMarkup(React.createElement(Carousel,{demos:fixtures.slice(0,count)}));
  assert.equal((html.match(/aria-roledescription="שקופית"/g)||[]).length,count);
  assert.equal((html.match(/aria-hidden="false"/g)||[]).length,count?1:0);
  assert.equal((html.match(/<button/g)||[]).length,count>1?count+2:0);
  if(count)assert.ok(html.includes('/sites/orange'));
}
console.log('PASS empty/single/multiple demos and initial accessible server rendering');

let cursor=0, effect, resize, width=360, reducedMotion=false;
const slots=[], frames=[];
const hooks={...React,
  useState(initial){const slot=cursor++;if(!(slot in slots))slots[slot]=initial;return [slots[slot],value=>{slots[slot]=value;}];},
  useRef(initial){const slot=cursor++;if(!(slot in slots))slots[slot]={current:initial};return slots[slot];},
  useId(){return `test-${cursor++}`;},
  useEffect(callback){effect??=callback;},
};
globalThis.window={matchMedia:()=>({matches:reducedMotion}),requestAnimationFrame:callback=>{frames.push(callback);return frames.length;},cancelAnimationFrame:()=>{}};
globalThis.ResizeObserver=class {constructor(callback){resize=callback;}observe(){}disconnect(){}};
const Interactive=component(hooks);
const nodes=tree=>!tree||typeof tree!=='object'?[]:[tree,...React.Children.toArray(tree.props?.children).flatMap(nodes)];
let elements;
const track={scrollLeft:0,lastBehavior:'',getBoundingClientRect:()=>({left:0,right:width}),scrollTo({left,behavior}){this.scrollLeft=left;this.lastBehavior=behavior;}};
function render(){
  cursor=0;elements=nodes(Interactive({demos:fixtures}));
  elements.find(node=>node.props?.onScroll).props.ref.current=track;
  elements.filter(node=>node.props?.['aria-roledescription']==='שקופית').forEach((node,index)=>node.props.ref({getBoundingClientRect:()=>({left:-index*(width+16)-track.scrollLeft,right:width-index*(width+16)-track.scrollLeft})}));
}
function scroll(){elements.find(node=>node.props?.onScroll).props.onScroll();while(frames.length)frames.shift()();render();}
function selected(name){
  assert.equal(elements.find(node=>node.props?.['aria-current']==='true').props['aria-label'].includes(name),true);
  assert.equal(elements.find(node=>node.props?.href).props.href,`/sites/${fixtures.find(d=>d.name===name).projectId}`);
}
render();const cleanup=effect();
selected('ORANGE.GEL');
elements.find(node=>node.props?.['aria-label']==='לדוגמה הבאה').props.onClick();scroll();selected('FORMA');assert.equal(track.scrollLeft,-376);
// Native touch/trackpad scrolling updates the same selected state and destination link.
track.scrollLeft=-752;scroll();selected('MOVE');
assert.equal(elements.find(node=>node.props?.['aria-label']==='לדוגמה הבאה').props.disabled,true);
let prevented=false;elements.find(node=>node.props?.onKeyDown).props.onKeyDown({key:'ArrowRight',preventDefault(){prevented=true;}});scroll();selected('FORMA');assert.equal(prevented,true);
width=280;resize();scroll();selected('FORMA');assert.equal(track.scrollLeft,-296);
reducedMotion=true;elements.find(node=>node.props?.onKeyDown).props.onKeyDown({key:'Home',preventDefault(){}});scroll();selected('ORANGE.GEL');assert.equal(track.lastBehavior,'instant');
elements.find(node=>node.props?.['aria-label']?.startsWith('הצגת MOVE')).props.onClick();scroll();selected('MOVE');
cleanup();
assert.match(css,/scroll-snap-type:\s*x mandatory/);
assert.ok(!/touch-action:\s*none|preventDefault\(\).*touch|setInterval/.test(source+css));
console.log('PASS RTL arrows, native scroll synchronization, dots, keyboard, resize and reduced motion');
