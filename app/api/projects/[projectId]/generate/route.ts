import { after, NextResponse } from 'next/server';
import { logOperationError, logStockOutcome, withErrorReference } from '@/lib/observability/errors';
import { readJson } from '@/lib/http/request';
import { generateSitePlan } from '@/lib/ai/gemini';
import { getCurrentUser } from '@/lib/data/current-user';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { safeEmail, safePhone, uuidPattern, whatsappNumber } from '@/lib/sites/document';
import { appendVersion, parseImageChoices, selectedImages, snapshotImages, workspaceError } from '@/lib/sites/workspace-server';
import { loadCreationSettings, saveCreationSettings, validateCreationAssets } from '@/lib/creation/server';
import { snapshotStockPhotos, placeStockPhotos } from '@/lib/stock/snapshot';

export const runtime = 'nodejs';
export const maxDuration = 180;
type Context = { params: Promise<{ projectId: string }> };

export async function GET(request: Request, { params }: Context) {
  const { projectId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error:'צריך להתחבר.' },{ status:401 });
  if (!uuidPattern.test(projectId)) return NextResponse.json({ error:'לא נמצא.' },{ status:404 });
  const admin = createAdminClient();
  const jobId = new URL(request.url).searchParams.get('job');
  if (jobId && !uuidPattern.test(jobId)) return NextResponse.json({ error:'לא נמצא.' },{ status:404 });
  let query = admin.from('site_generation_jobs').select('id,state,phase,error_message,version_id,expires_at').eq('project_id',projectId).eq('actor_id',user.id);
  if (jobId) query = query.eq('id', jobId);
  const { data: job, error } = await query.order('created_at',{ascending:false}).limit(1).maybeSingle();
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
    const client = await createClient();
    const { data: project } = await client.from('projects').select('id,business_name,business_type,location,contact_email,contact_phone,project_briefs(business_story,primary_goal,website_copy,important_links,tone,color_preference,design_notes),design_references(url,notes)').eq('id',projectId).eq('owner_id',user.id).single();
    if (!project) return NextResponse.json({error:'הפרויקט לא נמצא או שנדרש עדכון מסד הנתונים.'},{status:404});
    const settings = await loadCreationSettings(projectId);
    if (settings.imageSource === 'stock' && !process.env.PEXELS_API_KEY) return NextResponse.json({ error: 'בחירת תמונות אוטומטית עדיין לא הוגדרה. אפשר לבחור יצירה עם תמונות משלכם.' }, { status: 503 });
    if (settings.locks.design || settings.locks.text) return NextResponse.json({error:'יצירת כיוון חדש משנה עיצוב ותוכן. שחררו את הנעילות או השתמשו בעריכה ממוקדת.'},{status:409});
    const choices = body.images === undefined ? settings.images : parseImageChoices(body.images);
    if (body.images !== undefined) {
      settings.images = choices;
      const referenceId = choices.find(image => image.role === 'reference')?.id ?? null;
      if (settings.referenceAssetId !== referenceId) settings.analysis = undefined;
      settings.referenceAssetId = referenceId;
      if (typeof body.whatsapp === 'boolean') settings.contactPreference = body.whatsapp ? 'whatsapp' : 'phone';
      await saveCreationSettings(projectId, user.id, settings);
    }
    await validateCreationAssets(projectId, settings);
    const brief = Array.isArray(project.project_briefs) ? project.project_briefs[0] : project.project_briefs;
    if (!brief?.business_story && !brief?.website_copy && !brief?.primary_goal) return NextResponse.json({error:'ספרו מעט על העסק לפני היצירה.'},{status:422});
    const { data: latest } = await client.from('site_versions').select('id').eq('project_id',projectId).neq('visibility','preview').order('version_number',{ascending:false}).limit(1).maybeSingle();
    const admin = createAdminClient();
    const { data: job, error } = await admin.rpc('slate_start_generation',{p_project:projectId,p_actor:user.id,p_request:body.requestId});
    if (error) throw new Error(error.message);
    if (!job.claimed) return NextResponse.json({jobId:job.id,state:job.state},{status:job.state === 'running' ? 202 : 200});
    after(async () => {
      let phase = 'preparing';
      try {
        const images = await selectedImages(projectId, choices);
        if (Date.now() + (settings.imageSource === 'stock' ? 125_000 : 95_000) > new Date(job.expires_at).getTime()) throw new Error('הכנת התמונות ארכה יותר מדי. נסו שוב עם תמונות קטנות יותר.');
        phase = 'designing';
        await admin.from('site_generation_jobs').update({phase:'designing'}).eq('id',job.id);
        const { plan, stockQueries } = await generateSitePlan({businessName:project.business_name,businessType:project.business_type,location:project.location,businessStory:brief.business_story,primaryGoal:brief.primary_goal,websiteCopy:brief.website_copy,importantLinks:brief.important_links,tone:brief.tone,colorPreference:brief.color_preference,designNotes:brief.design_notes,designReferences:[],creation:settings},images.map(i=>i.model));
        if (Date.now() > new Date(job.expires_at).getTime()) throw new Error('היצירה ארכה יותר מדי. נסו שוב.');
        const currentSettings = await loadCreationSettings(projectId);
        if (currentSettings.locks.design || currentSettings.locks.text) throw new Error('הופעלה נעילה בזמן היצירה. הטיוטה הקודמת נשמרה.');
        plan.business = {name:project.business_name,type:project.business_type || '',location:project.location || '',email:safeEmail(project.contact_email),phone:safePhone(project.contact_phone),whatsapp:settings.contactPreference === 'whatsapp' ? whatsappNumber(safePhone(project.contact_phone)) : ''};
        plan.images = await snapshotImages(projectId,job.id,images);
        if (settings.imageSource === 'stock') {
          phase = 'sourcing';
          try {
            const hasPhotoBudget = Date.now() + 30_000 < new Date(job.expires_at).getTime();
            const stock = hasPhotoBudget
              ? await snapshotStockPhotos(projectId, job.id, stockQueries, 6 - plan.images.length) : [];
            logStockOutcome({ projectId, jobId: job.id }, !stockQueries.length ? 'no_subject' : !hasPhotoBudget ? 'budget_exhausted' : stock.length ? 'added' : 'no_usable_photos', stock.length);
            placeStockPhotos(plan, stock);
            if (!stock.length) plan.reviewNotes = [...plan.reviewNotes, 'לא נמצאו תמונות מאגר מתאימות בזמן היצירה. הטיוטה נשמרה; אפשר להוסיף תמונות משלכם בתצוגה המקדימה.'].slice(-6);
          } catch (stockError) {
            logOperationError(stockError, { operation: 'generate', projectId, jobId: job.id, phase });
            plan.reviewNotes = [...plan.reviewNotes, 'בחירת תמונות המאגר לא הושלמה. התוכן נשמר ואפשר להוסיף תמונות בתצוגה המקדימה.'].slice(-6);
          }
        }
        phase = 'saving';
        await admin.from('site_generation_jobs').update({phase:'saving'}).eq('id',job.id);
        if (Date.now() > new Date(job.expires_at).getTime()) throw new Error('GENERATION_EXPIRED');
        const finalSettings = await loadCreationSettings(projectId);
        if (finalSettings.locks.design || finalSettings.locks.text) throw new Error('הופעלה נעילה בזמן היצירה. הטיוטה הקודמת נשמרה.');
        const version = await appendVersion(projectId,user.id,plan,latest?.id ?? null,job.id);
        await admin.from('site_generation_jobs').update({state:'completed',phase:'done',version_id:version.id}).eq('id',job.id);
      } catch (error) {
        const result = workspaceError(error);
        const reference = logOperationError(error, { operation: 'generate', projectId, jobId: job.id, phase });
        result.error = withErrorReference(result.error, reference);
        await admin.from('site_generation_jobs').update({state:'failed',error_message:result.error}).eq('id',job.id).eq('state','running');
      }
    });
    return NextResponse.json({jobId:job.id,state:'running'},{status:202});
  } catch (error) {
    const result = workspaceError(error);
    const reference = logOperationError(error, { operation: 'generate', projectId, phase: 'preparing' });
    return NextResponse.json({error:withErrorReference(result.error, reference)},{status:result.status});
  }
}
