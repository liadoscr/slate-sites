// Only imports the two explicitly requested fictional demos into the verified owner account.
// Dry-run by default. Never overwrite existing briefs, images or saved versions.
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath } from 'node:url';
import demos from '../lib/sites/business-demos.json' with { type: 'json' };

nextEnv.loadEnvConfig(fileURLToPath(new URL('../', import.meta.url)));
const apply = process.argv.includes('--apply');
const publish = process.argv.includes('--publish');
const email = 'liadoscr@gmail.com';
const origin = 'https://slate-sites.vercel.app';
const checked = (result, step) => {
  if (result.error) throw new Error(`${step} failed (${result.error.code ?? result.status ?? 'request error'}).`);
  return result.data;
};

async function main() {
  if (publish && !apply) throw new Error('Publishing also requires --apply.');
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase server configuration is missing.');
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const owners = checked(await db.from('profiles').select('id').eq('email', email), 'Owner lookup');
  if (owners.length !== 1) throw new Error('Expected exactly one matching profile. No demo data changed.');
  const ownerId = owners[0].id;
  const { user } = checked(await db.auth.admin.getUserById(ownerId), 'Verified owner lookup');
  if (user.email?.toLowerCase() !== email || !user.email_confirmed_at) throw new Error('Owner email is not verified. No demo data changed.');

  // Preflight both projects before any writes; recognize only our stable IDs and versions.
  const states = [];
  for (const demo of demos) {
    const image = readFileSync(new URL(`../public${demo.image}`, import.meta.url));
    if (image.subarray(0,4).toString() !== 'RIFF' || image.subarray(8,12).toString() !== 'WEBP' || image.length > 8*1024*1024) throw new Error('Invalid demo WebP.');
    const existing = checked(await db.from('projects').select('id,owner_id,business_name').eq('id', demo.projectId).maybeSingle(), 'Project lookup');
    if (existing && (existing.owner_id !== ownerId || existing.business_name !== demo.name)) throw new Error('A demo ID is already in use; no data overwritten.');
    const duplicates = checked(await db.from('projects').select('id').eq('owner_id', ownerId).eq('business_name', demo.name), 'Duplicate check');
    if (duplicates.some(row => row.id !== demo.projectId)) throw new Error('A matching demo already exists under another ID. Reconcile before importing.');
    const versions = checked(await db.from('site_versions').select('id,request_id,content,visibility,version_number').eq('project_id', demo.projectId).order('version_number'), 'Version lookup');
    if (versions.some(row => row.request_id !== demo.requestId || !isDeepStrictEqual(row.content, demo.plan))) throw new Error('The demo contains newer or different work. Import will not change it.');
    const brief = checked(await db.from('project_briefs').select('project_id').eq('project_id', demo.projectId).maybeSingle(), 'Brief lookup');
    const path = `${demo.projectId}/demo/${demo.image.split('/').at(-1)}`;
    const asset = checked(await db.from('project_assets').select('id,project_id').eq('storage_path', path).maybeSingle(), 'Asset lookup');
    if (asset && asset.project_id !== demo.projectId) throw new Error('Asset owner mismatch.');
    states.push({ demo, image, existing, version: versions[0], brief, path, asset });
  }
  if (!apply) {
    console.log(JSON.stringify({ mode:'dry-run',ownerVerified:true,demos:states.map(({demo,existing,version})=>({name:demo.name,projectId:demo.projectId,projectExists:Boolean(existing),versionExists:Boolean(version),visibility:version?.visibility??null})) }));
    return;
  }
  for (const state of states) {
    const { demo, image, existing, brief, path, asset } = state;
    if (!existing) checked(await db.from('projects').upsert({ id:demo.projectId,owner_id:ownerId,business_name:demo.name,business_type:demo.plan.business.type,location:demo.plan.business.location,status:'preview_ready' }, {onConflict:'id',ignoreDuplicates:true}), 'Demo creation');
    if (!brief) checked(await db.from('project_briefs').upsert({ project_id:demo.projectId,business_story:demo.plan.positioning,primary_goal:'אתר תדמית ומידע בלבד. ללא קביעת תורים, הזמנות, רכישה או תשלום.',website_copy:demo.plan.sections.map(s=>`${s.headline}\n${s.body}`).join('\n\n'),tone:demo.name==='FORMA'?'נקי ומקצועי':'נועז וחדשני',color_preference:demo.plan.visualDirection.palette.join(', '),design_notes:demo.plan.visualDirection.summary }, {onConflict:'project_id',ignoreDuplicates:true}), 'Brief creation');
    if (!asset) {
      const filename = demo.image.split('/').at(-1);
      const files = checked(await db.storage.from('project-assets').list(`${demo.projectId}/demo`,{search:filename}), 'Image lookup');
      if (!files.some(file=>file.name===filename)) checked(await db.storage.from('project-assets').upload(path,image,{contentType:'image/webp',upsert:false}), 'Image upload');
      checked(await db.from('project_assets').upsert({project_id:demo.projectId,storage_path:path,original_name:filename,mime_type:'image/webp',size_bytes:image.length},{onConflict:'storage_path',ignoreDuplicates:true}), 'Image registration');
    }
    let version = state.version;
    if (!version) version = checked(await db.rpc('slate_append_version',{p_project:demo.projectId,p_actor:ownerId,p_content:demo.plan,p_expected:null,p_request:demo.requestId,p_proposal:false}), 'Immutable demo version');
    if (!isDeepStrictEqual(version.content, demo.plan)) throw new Error('Saved version is not the expected demo. Publishing stopped.');
    if (publish && version.visibility !== 'public') {
      // Recheck immediately before publication; never publish over later owner work.
      const latest = checked(await db.from('site_versions').select('id').eq('project_id',demo.projectId).order('version_number',{ascending:false}).limit(1).single(), 'Latest version check');
      if (latest.id !== version.id) throw new Error('Newer work exists. Publication stopped.');
      checked(await db.rpc('slate_publish_version',{p_project:demo.projectId,p_actor:ownerId,p_version:version.id,p_url:`${origin}/sites/${demo.projectId}`}), 'Exact demo publication');
    }
    const saved = checked(await db.from('projects').select('owner_id,status,project_briefs(project_id),project_assets(id),site_versions(id,visibility)').eq('id',demo.projectId).single(), 'Final verification');
    console.log(JSON.stringify({name:demo.name,ownerVerified:saved.owner_id===ownerId,projectId:demo.projectId,status:saved.status,assets:saved.project_assets.length,versions:saved.site_versions.length,public:saved.site_versions.some(v=>v.id===version.id&&v.visibility==='public'),dashboardUrl:`${origin}/dashboard/projects/${demo.projectId}`,publicUrl:publish?`${origin}/sites/${demo.projectId}`:null}));
  }
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Demo import failed.');process.exitCode=1;});
