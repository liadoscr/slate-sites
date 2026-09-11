// One-time, repeat-safe import for the owner's explicitly requested product demo.
// Dry run by default. Secrets are loaded in-process and never logged.
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import demo from '../lib/sites/orange-demo.json' with { type: 'json' };

nextEnv.loadEnvConfig(fileURLToPath(new URL('../', import.meta.url)));
const apply = process.argv.includes('--apply');
const publish = process.argv.includes('--publish');
const email = 'liadoscr@gmail.com';
const origin = 'https://slate-sites.vercel.app';
const projectId = demo.projectId;
const assetPath = `${projectId}/demo/gel-orange-hero.png`;

function checked(result, step) {
  if (result.error) throw new Error(`${step} failed (${result.error.code ?? result.status ?? 'request error'}).`);
  return result.data;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Local Supabase server configuration is missing.');
  if (publish && !apply) throw new Error('Publishing requires --apply as well.');
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const profiles = checked(await db.from('profiles').select('id,email').eq('email', email), 'Owner lookup');
  if (profiles.length !== 1) throw new Error('Expected exactly one matching owner profile; no data changed.');
  const owner = profiles[0];
  const auth = checked(await db.auth.admin.getUserById(owner.id), 'Owner verification');
  if (auth.user.email?.toLowerCase() !== email || !auth.user.email_confirmed_at) throw new Error('The matching account must have a verified email; no data changed.');

  const existing = checked(await db.from('projects').select('id,owner_id,business_name,status').eq('id', projectId).maybeSingle(), 'Project lookup');
  if (existing && (existing.owner_id !== owner.id || existing.business_name !== 'ORANGE.GEL')) throw new Error('Import identifier is already in use; no data changed.');
  const matches = checked(await db.from('projects').select('id').eq('owner_id', owner.id).ilike('business_name', '%orange%'), 'Duplicate check');
  if (matches.some((row) => row.id !== projectId)) throw new Error('Another Orange project already exists; reconcile it before importing.');
  let version = checked(await db.from('site_versions').select('id,content,visibility').eq('project_id', projectId).eq('version_number', 1).maybeSingle(), 'Version lookup');
  if (version && version.content?.template !== demo.template) throw new Error('Existing version is not this demo; nothing will be overwritten.');
  if (!apply) {
    console.log(JSON.stringify({ mode: 'dry-run', ownerVerified: true, projectId, projectExists: Boolean(existing), demoVersionExists: Boolean(version), visibility: version?.visibility ?? null }));
    return;
  }

  checked(await db.from('projects').upsert({ id: projectId, owner_id: owner.id, business_name: 'ORANGE.GEL', business_type: 'סטודיו לק ג׳ל · אתר הדגמה', location: 'רמת גן (דמו)', status: 'preview_ready' }, { onConflict: 'id', ignoreDuplicates: true }), 'Project creation');
  checked(await db.from('project_briefs').upsert({ project_id: projectId, business_story: demo.plan.positioning, primary_goal: 'הדגמת אתר עסקי בעיצוב מקורי, כחלק ממוצר Slate Sites.', website_copy: demo.plan.sections.map((section) => `${section.headline}\n${section.body}`).join('\n\n'), tone: 'נועז וחדשני', color_preference: demo.plan.visualDirection.palette.join(', ') }, { onConflict: 'project_id', ignoreDuplicates: true }), 'Brief creation');

  const asset = checked(await db.from('project_assets').select('id').eq('storage_path', assetPath).maybeSingle(), 'Asset lookup');
  if (!asset) {
    const image = readFileSync(new URL('../public/gel-orange-hero.png', import.meta.url));
    const files = checked(await db.storage.from('project-assets').list(`${projectId}/demo`, { search: 'gel-orange-hero.png' }), 'Upload lookup');
    if (!files.some((file) => file.name === 'gel-orange-hero.png')) checked(await db.storage.from('project-assets').upload(assetPath, image, { contentType: 'image/png', upsert: false }), 'Image upload');
    checked(await db.from('project_assets').upsert({ project_id: projectId, storage_path: assetPath, original_name: 'gel-orange-hero.png', mime_type: 'image/png', size_bytes: image.length }, { onConflict: 'storage_path', ignoreDuplicates: true }), 'Asset registration');
  }
  if (!version) {
    checked(await db.from('site_versions').upsert({ project_id: projectId, version_number: 1, content: demo.plan, visibility: 'private', preview_url: `${origin}/dashboard/projects/${projectId}/preview` }, { onConflict: 'project_id,version_number', ignoreDuplicates: true }), 'Demo version creation');
    version = checked(await db.from('site_versions').select('id,content,visibility').eq('project_id', projectId).eq('version_number', 1).single(), 'Version verification');
    if (version.content?.template !== demo.template) throw new Error('Unexpected version content; publishing stopped.');
  }
  if (publish) {
    const newer = checked(await db.from('site_versions').select('id').eq('project_id', projectId).gt('version_number', 1).limit(1), 'Newer version check');
    if (newer.length) throw new Error('Newer work exists. Import will not change publication.');
    checked(await db.from('site_versions').update({ visibility: 'public', published_url: `${origin}/sites/${projectId}` }).eq('id', version.id), 'Demo publication');
    checked(await db.from('projects').update({ status: 'published' }).eq('id', projectId).eq('owner_id', owner.id), 'Publication status');
  }
  const verified = checked(await db.from('projects').select('id,owner_id,project_briefs(id),project_assets(id),site_versions(version_number,visibility)').eq('id', projectId).single(), 'Final verification');
  const briefCount = Array.isArray(verified.project_briefs) ? verified.project_briefs.length : verified.project_briefs ? 1 : 0;
  console.log(JSON.stringify({ imported: true, ownerVerified: verified.owner_id === owner.id, projectId, briefCount, assetCount: verified.project_assets.length, versions: verified.site_versions, dashboardUrl: `${origin}/dashboard/projects/${projectId}`, publicUrl: publish ? `${origin}/sites/${projectId}` : null }));
}

main().catch((error) => { console.error(error instanceof Error ? error.message : 'Import failed. Re-run the dry run before retrying.'); process.exitCode = 1; });
