// Offline regression checks: no database writes, AI calls or email sends.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const require=createRequire(import.meta.url);
const swc=require('next/dist/build/swc');
const root=resolve(import.meta.dirname,'..');
const mocks=new Map(); const cache=new Map();
function load(path){
  const filename=resolve(root,path);if(cache.has(filename))return cache.get(filename);
  const source=readFileSync(filename,'utf8');
  const {code}=swc.transformSync(source,{filename,jsc:{parser:{syntax:'typescript',tsx:filename.endsWith('.tsx')},transform:{react:{runtime:'automatic'}},target:'es2022'},module:{type:'commonjs'}});
  const module={exports:{}};cache.set(filename,module.exports);
  new Function('require','module','exports',code)(specifier=>{
    if(specifier==='server-only')return {};
    if(mocks.has(specifier))return mocks.get(specifier);
    if(specifier.endsWith('.css'))return new Proxy({},{get:(_,name)=>String(name)});
    if(specifier.startsWith('@/'))return load(`${specifier.slice(2)}.ts`);
    return require(specifier);
  },module,module.exports);
  cache.set(filename,module.exports);return module.exports;
}
let checks=0;function check(name,run){run();checks++;console.log(`PASS ${name}`);}
const doc=load('lib/sites/document.ts');
const {safeNextPath}=load('lib/auth/safe-next-path.ts');
check('redirects stay on our origin',()=>{
  for(const input of ['//evil.test','/\\evil.test','/%5cevil.test','/\nevil','https://evil.test','/%00','/%broken'])assert.equal(safeNextPath(input),'/dashboard');
  assert.equal(safeNextPath('/dashboard/projects/test?version=2'),'/dashboard/projects/test?version=2');
});
check('contact values reject executable or malformed targets',()=>{
  assert.equal(doc.safePhone('javascript:alert(1)'),'');assert.equal(doc.safeEmail('a@x.test\nBcc:b@x.test'),'');
  assert.equal(doc.safePhone('+972 (50) 123-4567'),'+972501234567');assert.equal(doc.whatsappNumber('0501234567'),'972501234567');
});
check('theme values are constrained and light accents darken for contrast',()=>{
  assert.notEqual(doc.safeAccent('#ffffff'),'#ffffff');assert.equal(doc.safeAccent('url(https://evil.test)'),'#5048e5');
});
const {readJson}=load('lib/http/request.ts');
await assert.rejects(readJson(new Request('http://localhost',{method:'POST',body:'{"a":"'+ 'x'.repeat(30000)+'"}'})),/גדולה/);
assert.deepEqual(await readJson(new Request('http://localhost',{method:'POST',body:'{"a":1}'})),{a:1});checks++;console.log('PASS bounded request parsing');
const plan={version:1,siteTitle:'אתר בדיקה',positioning:'תוכן עסקי לבדיקה',visualDirection:{summary:'PRIVATE DESIGN NOTES',palette:['#ffccee'],typography:'PRIVATE TYPOGRAPHY',layout:'PRIVATE LAYOUT'},sections:[{id:'section-1',kind:'hero',label:'פתיחה',headline:'אתר בדיקה',body:'פתיחה'},{id:'section-2',kind:'about',label:'אודות',headline:'על העסק',body:'<script>alert(1)</script>'}],seo:{title:'כותרת',description:'תיאור',keywords:[]},contactCta:'צרו קשר',missingInformation:[],reviewNotes:[],business:{name:'עסק לדוגמה',type:'סטודיו',location:'תל אביב',phone:'0501234567',email:'',whatsapp:'972501234567'},images:[{id:'00000000-0000-4000-8000-000000000001',path:'PRIVATE_BUCKET_PATH',alt:'תמונה לדוגמה',role:'hero',mimeType:'image/png'}]};
const {SiteRenderer}=load('components/sites/site-renderer.tsx');
const React=require('react');const {renderToStaticMarkup}=require('react-dom/server');
check('shared renderer uses business content, not design notes or private storage paths',()=>{
  for(const layout of ['split','editorial','centered']){
    const html=renderToStaticMarkup(React.createElement(SiteRenderer,{projectId:'project',versionId:'version',plan:{...plan,theme:{layout,accent:'#5048e5',font:'modern',corners:'soft'}}}));
    assert.ok(html.includes(`data-layout="${layout}"`));assert.ok(html.includes('/api/sites/project/media/version/'));
    assert.ok(!html.includes('PRIVATE_'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>alert'));
    assert.ok(html.includes('https://wa.me/972501234567'));assert.equal((html.match(/<h1/g)||[]).length,1);
  }
});
let modelCall;
const modelPlan={...plan,sections:Array.from({length:5},(_,i)=>({id:'duplicate',label:'מקטע',headline:'כותרת',body:'תוכן',kind:i===0?'hero':'about',imageId:i===0?'allowed':'forbidden'})),theme:{layout:'editorial',accent:'#ffffff',font:'modern',corners:'soft'}};
mocks.set('@google/genai',{GoogleGenAI:class{models={generateContent:async(args)=>{modelCall=args;return {text:JSON.stringify(modelPlan)}}}}});
process.env.GEMINI_API_KEY='offline-test-not-a-real-key';
const {generateSitePlan}=load('lib/ai/gemini.ts');
const generated=await generateSitePlan({businessName:'בדיקה',designNotes:'צילום רחב',designReferences:[]},[{id:'allowed',role:'hero',alt:'בדיקה',mimeType:'image/png',data:'test-bytes'},{id:'forbidden',role:'reference',alt:'השראה',mimeType:'image/png',data:'reference-bytes'}]);
check('Gemini image input and output remain bounded to selected publishable assets',()=>{
  assert.equal(modelCall.contents[0].parts.filter(p=>p.inlineData).length,2);
  assert.equal(generated.plan.theme.layout,'editorial');assert.equal(new Set(generated.plan.sections.map(s=>s.id)).size,5);
  assert.equal(generated.plan.sections[0].imageId,'allowed');assert.equal(generated.plan.sections[1].imageId,undefined);
  assert.ok(!JSON.stringify(generated.plan).includes('test-bytes'));
});
const sql=readFileSync(resolve(root,'supabase/migrations/202609110001_site_workspace.sql'),'utf8');
check('migration includes scoped atomic publication, job fencing and private media',()=>{
  assert.ok(sql.includes('one_live_version_per_project'));assert.ok(sql.includes("raise exception 'GENERATION_EXPIRED'"));
  assert.ok(sql.includes("set state='completed', phase='done', version_id=saved.id"));
  assert.ok(sql.includes('from public, anon, authenticated'));assert.ok(sql.includes("'site-version-assets','site-version-assets',false"));
});
console.log(`${checks} offline regression checks passed. SQL execution and authenticated end-to-end tests still require the migrated Supabase project.`);
