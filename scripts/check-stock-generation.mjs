// Synthetic generation and rendering tests. No database, model or Pexels traffic.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url), root = resolve(import.meta.dirname, '..');
const mocks = new Map(), cache = new Map();
function load(path) {
  const filename = resolve(root, path);
  if (cache.has(filename)) return cache.get(filename);
  const { code } = require('next/dist/build/swc').transformSync(readFileSync(filename,'utf8'), { filename, jsc:{parser:{syntax:'typescript',tsx:filename.endsWith('.tsx')},target:'es2022',transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'} });
  const module = {exports:{}};
  new Function('require','module','exports',code)(name => {
    if (mocks.has(name)) return mocks.get(name);
    if (name === 'server-only') return {};
    if (name.endsWith('.css')) return new Proxy({}, {get:(_,key)=>String(key)});
    if (name.startsWith('@/')) return load(`${name.slice(2)}.ts`);
    if (name.startsWith('.')) return load(resolve(dirname(filename),`${name}.ts`));
    return require(name);
  },module,module.exports);
  cache.set(filename,module.exports); return module.exports;
}
const projectId='11111111-1111-4111-8111-111111111111',jobId='22222222-2222-4222-8222-222222222222',assetId='33333333-3333-4333-8333-333333333333';
const credit={provider:'pexels',photoId:'123',photographer:'Test Photographer',photographerUrl:'https://www.pexels.com/@test.user/',sourceUrl:'https://www.pexels.com/photo/test-123/'};
const plan={version:1,siteTitle:'עסק',positioning:'שירות אישי',sections:[{id:'hero',kind:'hero',label:'פתיחה',headline:'עסק',body:'תיאור'},{id:'services',kind:'services',label:'שירות',headline:'שירותים',body:'תיאור'},{id:'gallery',kind:'gallery',label:'עבודות',headline:'עבודות שלנו',body:'תיאור'}],seo:{title:'עסק',description:'שירות',keywords:[]},contactCta:'צרו קשר',missingInformation:[],reviewNotes:[],visualDirection:{summary:'',palette:[],typography:'',layout:''}};
let state;
function reset(){state={stockFails:false,modelFails:false,key:true,user:{id:projectId},owner:true,claimed:true,locked:false,finalLock:false,reads:0,stockCalls:0,modelCalls:0,jobs:[],saved:[],uploads:[],callbacks:[],quota:0};}
reset();
const settings=()=>({schemaVersion:1,creationMode:'automatic',imageSource:'stock',images:[],contactPreference:'form',locks:{design:state.locked || (state.finalLock && state.reads>=3),text:false}});
function query(table){const q={select(){return q;},eq(){return q;},neq(){return q;},order(){return q;},limit(){return q;},update(v){state.jobs.push(v);return q;},async single(){return {data:state.owner?{id:projectId,business_name:'העסק שלי',project_briefs:{business_story:'קצבייה משפחתית'}}:null};},async maybeSingle(){return {data:null};},then(ok,fail){return Promise.resolve({error:null}).then(ok,fail);}};return q;}
const admin={from:query,rpc:async()=>{state.quota++;return {data:{id:jobId,claimed:state.claimed,state:'running',expires_at:new Date(Date.now()+150000).toISOString()}};},storage:{from:()=>({upload:async(path)=>{state.uploads.push(path);return {error:null};},remove:async()=>({error:null})})}};
mocks.set('@/lib/supabase/admin',{createAdminClient:()=>admin});
mocks.set('@/lib/supabase/server',{createClient:async()=>({from:query})});
mocks.set('@/lib/data/current-user',{getCurrentUser:async()=>state.user});
mocks.set('next/server',{...require('next/server'),after:fn=>state.callbacks.push(fn)});
mocks.set('@/lib/creation/server',{loadCreationSettings:async()=>{state.reads++;return settings();},validateCreationAssets:async()=>{}});
mocks.set('@/lib/ai/gemini',{generateSitePlan:async(brief,images)=>{state.modelCalls++;assert.equal(images.length,0);if(state.modelFails)throw new Error('invalid JSON');return {plan:structuredClone(plan),stockQueries:['fresh meat butcher counter']};}});
mocks.set('@/lib/sites/workspace-server',{selectedImages:async()=>[],snapshotImages:async()=>[],appendVersion:async(p,u,value)=>{state.saved.push(value);return {id:assetId};},workspaceError:()=>({status:502,error:'תקלה לבדיקה'})});
mocks.set('./pexels',{findStockPhotos:async queries=>{state.stockCalls++;assert.deepEqual(queries,['fresh meat butcher counter']);if(state.stockFails)throw new Error('fetch failed');return [1,2,3].map(n=>({bytes:Buffer.from([255,216,255]),mimeType:'image/jpeg',alt:'Illustration',attribution:{...credit,photoId:String(n)}}));}});
const stock=load('lib/stock/snapshot.ts');
mocks.set('@/lib/stock/snapshot',stock);
const {POST}=load('app/api/projects/[projectId]/generate/route.ts');
const originalKey=process.env.PEXELS_API_KEY;process.env.PEXELS_API_KEY='synthetic-only';
const originalError=console.error;const logs=[];console.error=value=>logs.push(value);
async function run(body={},origin='https://local.test') {const response=await POST(new Request('https://local.test/api/generate',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify({requestId:jobId,consent:true,...body})}),{params:Promise.resolve({projectId})});for(const fn of state.callbacks)await fn();return response;}
try {
  reset();assert.equal((await run()).status,202);assert.equal(state.saved.length,1);assert.equal(state.saved[0].images.length,3);assert.ok(state.saved[0].heroImageId);assert.equal(state.saved[0].business.phone,'');assert.equal(state.saved[0].sections[2].headline,'השראה ואווירה');assert.equal(state.jobs.at(-1).state,'completed');
  mocks.set('./site-motion',{SiteMotion:()=>null});
  const {SiteRenderer}=load('components/sites/site-renderer.tsx');
  const html=require('react-dom/server').renderToStaticMarkup(require('react').createElement(SiteRenderer,{plan:state.saved[0],projectId,versionId:jobId}));
  assert.ok(html.includes('Photos provided by Pexels'));assert.ok(html.includes(credit.sourceUrl));assert.ok(html.includes('תמונת מאגר להמחשה'));assert.ok(!html.includes('תמונות מהעסק'));
  reset();state.stockFails=true;await run();assert.equal(state.saved.length,1);assert.equal(state.saved[0].images.length,0);assert.ok(state.saved[0].reviewNotes.some(note=>note.includes('לא הושלמה')));assert.ok(logs.some(line=>line.includes('sourcing')));
  reset();state.modelFails=true;await run();assert.equal(state.saved.length,0);assert.equal(state.jobs.at(-1).state,'failed');assert.equal(state.stockCalls,0);
  reset();state.finalLock=true;await run();assert.equal(state.saved.length,0);assert.equal(state.jobs.at(-1).state,'failed');
  reset();delete process.env.PEXELS_API_KEY;assert.equal((await run()).status,503);assert.equal(state.quota,0);process.env.PEXELS_API_KEY='synthetic-only';
  reset();state.claimed=false;await run();assert.equal(state.stockCalls,0);assert.equal(state.modelCalls,0);
  reset();assert.equal((await run({consent:false})).status,422);assert.equal(state.quota,0);
  reset();assert.equal((await run({},'https://evil.test')).status,403);assert.equal(state.quota,0);
  reset();state.user=null;assert.equal((await run()).status,401);
  reset();state.owner=false;assert.equal((await run()).status,404);
} finally { console.error=originalError;if(originalKey===undefined)delete process.env.PEXELS_API_KEY;else process.env.PEXELS_API_KEY=originalKey; }
console.log('PASS private stock generation, safe attribution/rendering, photo-search fallback, AI failure, late lock, missing key, idempotency, consent, origin and ownership');
