// Opt-in: one real Gemini request with synthetic business data and a tiny test
// image. Never reads customer projects, persists a site, or publishes anything.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
if(!process.argv.includes('--live')){console.log('Use --live to make one bounded Gemini request with synthetic data.');process.exit(0);}
const require=createRequire(import.meta.url);const root=resolve(import.meta.dirname,'..');
process.loadEnvFile(resolve(root,'.env.local'));
const swc=require('next/dist/build/swc');const cache=new Map();
function load(path){const filename=resolve(root,path);if(cache.has(filename))return cache.get(filename);const {code}=swc.transformSync(readFileSync(filename,'utf8'),{filename,jsc:{parser:{syntax:'typescript'},target:'es2022'},module:{type:'commonjs'}});const module={exports:{}};new Function('require','module','exports',code)(specifier=>specifier==='server-only'?{}:specifier.startsWith('@/')?load(`${specifier.slice(2)}.ts`):require(specifier),module,module.exports);cache.set(filename,module.exports);return module.exports;}
try{
  const {generateSitePlan}=load('lib/ai/gemini.ts');
  const {plan,model}=await generateSitePlan({businessName:'סטודיו בדיקה — נתונים סינתטיים',businessType:'סטודיו לעיצוב',location:'תל אביב',businessStory:'זהו עסק פיקטיבי לבדיקת תוכנה. הסטודיו מציע עיצוב כרטיסי ביקור.',primaryGoal:'יצירת קשר',designNotes:'כותרת רחבה ומבנה editorial. התמונה המצורפת היא פיקסל בדיקה בלבד, לא צילום של העסק.',designReferences:[]},[{id:'00000000-0000-4000-8000-000000000001',role:'reference',alt:'פיקסל בדיקה בלבד',mimeType:'image/png',data:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='}]);
  if(plan.sections.length<5||!plan.theme||plan.sections.some(s=>s.imageId))throw new Error('Invalid generated document');
  console.log(JSON.stringify({ok:true,model,sections:plan.sections.length,layout:plan.theme.layout,referenceNotPublished:true}));
}catch(error){console.error(JSON.stringify({ok:false,status:typeof error?.status==='number'?error.status:'generation_failed',message:'The synthetic Gemini check did not succeed. No site or customer data was changed.'}));process.exitCode=1;}
