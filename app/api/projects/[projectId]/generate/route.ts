import { after, NextResponse } from 'next/server';
import { readJson } from '@/lib/http/request';
import { generateSitePlan } from '@/lib/ai/gemini';
import { getCurrentUser } from '@/lib/data/current-user';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { safeEmail, safePhone, uuidPattern, whatsappNumber } from '@/lib/sites/document';
import { appendVersion, parseImageChoices, selectedImages, snapshotImages, workspaceError } from '@/lib/sites/workspace-server';

export const runtime = 'nodejs';
export const maxDuration = 180;
type Context = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { projectId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error:'צריך להתחבר.' },{ status:401 });
  if (!uuidPattern.test(projectId)) return NextResponse.json({ error:'לא נמצא.' },{ status:404 });
  const admin = createAdminClient();
  const { data: job, error } = await admin.from('site_generation_jobs').select('id,state,phase,error_message,version_id,expires_at').eq('project_id',projectId).eq('actor_id',user.id).order('created_at',{ascending:false}).limit(1).maybeSingle();
  if (error) return NextResponse.json({ job:null, setupRequired:true },{ headers:{'Cache-Control':'no-store'} });
  if (job?.state === 'running' && new Date(job.expires_at).getTime() < Date.now()) {
    const { data: saved } = await admin.from('site_versions').select('id').eq('project_id',projectId).eq('request_id',job.id).maybeSingle();
    job.state = saved ? 'completed' : 'failed'; job.version_id = saved?.id ?? null;
    job.error_message = saved ? null : 'היצירה לא הסתיימה בזמן. התוכן הקודם נשמר; אפשר לנסות שוב.';
    await admin.from('site_generation_jobs').update({state:job.state,version_id:job.version_id,error_message:job.error_message}).eq('id',job.id).eq('state','running');
  }
  return NextResponse.json({ job },{ headers:{'Cache-Control':'no-store'} });
}

export async function POST(request: Request, { params }: Context) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({ error:'בקשה לא תקינה.' },{status:403});
  const { projectId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error:'צריך להתחבר.' },{status:401});
  if (!uuidPattern.test(projectId)) return NextResponse.json({ error:'לא נמצא.' },{status:404});
  try {
    const body = await readJson(request);
    if (!uuidPattern.test(body.requestId) || body.consent !== true) return NextResponse.json({error:'אשרו את שליחת הבריף והתמונות שנבחרו ל־Gemini.'},{status:422});
    const choices = parseImageChoices(body.images ?? []);
    const client = await createClient();
    const { data: project } = await client.from('projects').select('id,business_name,business_type,location,contact_email,contact_phone,project_briefs(business_story,primary_goal,website_copy,important_links,tone,color_preference,design_notes),design_references(url,notes)').eq('id',projectId).eq('owner_id',user.id).single();
    if (!project) return NextResponse.json({error:'הפרויקט לא נמצא או שנדרש עדכון מסד הנתונים.'},{status:404});
    const brief = Array.isArray(project.project_briefs) ? project.project_briefs[0] : project.project_briefs;
    if (!brief?.business_story && !brief?.website_copy && !brief?.primary_goal) return NextResponse.json({error:'ספרו מעט על העסק לפני היצירה.'},{status:422});
    const { data: latest } = await client.from('site_versions').select('id').eq('project_id',projectId).neq('visibility','preview').order('version_number',{ascending:false}).limit(1).maybeSingle();
    const admin = createAdminClient();
    const { data: job, error } = await admin.rpc('slate_start_generation',{p_project:projectId,p_actor:user.id,p_request:body.requestId});
    if (error) throw new Error(error.message);
    if (!job.claimed) return NextResponse.json({jobId:job.id,state:job.state},{status:job.state === 'running' ? 202 : 200});
    after(async () => {
      try {
        const images = await selectedImages(projectId, choices);
        if (Date.now() + 95_000 > new Date(job.expires_at).getTime()) throw new Error('הכנת התמונות ארכה יותר מדי. נסו שוב עם תמונות קטנות יותר.');
        await admin.from('site_generation_jobs').update({phase:'designing'}).eq('id',job.id);
        const { plan } = await generateSitePlan({businessName:project.business_name,businessType:project.business_type,location:project.location,businessStory:brief.business_story,primaryGoal:brief.primary_goal,websiteCopy:brief.website_copy,importantLinks:brief.important_links,tone:brief.tone,colorPreference:brief.color_preference,designNotes:brief.design_notes,designReferences:project.design_references ?? []},images.map(i=>i.model));
        if (Date.now() > new Date(job.expires_at).getTime()) throw new Error('היצירה ארכה יותר מדי. נסו שוב.');
        await admin.from('site_generation_jobs').update({phase:'saving'}).eq('id',job.id);
        plan.business = {name:project.business_name,type:project.business_type || '',location:project.location || '',email:safeEmail(project.contact_email),phone:safePhone(project.contact_phone),whatsapp:body.whatsapp === true ? whatsappNumber(safePhone(project.contact_phone)) : ''};
        plan.images = await snapshotImages(projectId,job.id,images);
        const version = await appendVersion(projectId,user.id,plan,latest?.id ?? null,job.id);
        await admin.from('site_generation_jobs').update({state:'completed',phase:'done',version_id:version.id}).eq('id',job.id);
      } catch (error) {
        const result = workspaceError(error);
        await admin.from('site_generation_jobs').update({state:'failed',error_message:result.error}).eq('id',job.id).eq('state','running');
        console.error('Site generation failed', { projectId, status:result.status });
      }
    });
    return NextResponse.json({jobId:job.id,state:'running'},{status:202});
  } catch (error) { const result = workspaceError(error); return NextResponse.json({error:result.error},{status:result.status}); }
}
