import { NextResponse } from 'next/server';
import { readJson } from '@/lib/http/request';
import { getCurrentUser } from '@/lib/data/current-user';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { rewriteSection } from '@/lib/ai/gemini';
import { cleanText, isSitePlan, themeFor, safeAccent, uuidPattern } from '@/lib/sites/document';
import { appendVersion, workspaceError } from '@/lib/sites/workspace-server';
export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request: Request, { params }: {params:Promise<{projectId:string}>}) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({error:'בקשה לא תקינה.'},{status:403});
  const { projectId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({error:'צריך להתחבר.'},{status:401});
  if (!uuidPattern.test(projectId)) return NextResponse.json({error:'לא נמצא.'},{status:404});
  let jobId: string | undefined;
  try {
    const body = await readJson(request);
    if (!uuidPattern.test(body.baseVersionId) || !uuidPattern.test(body.requestId)) return NextResponse.json({error:'רעננו את הפרויקט ונסו שוב.'},{status:422});
    const client = await createClient();
    const { data: base } = await client.from('site_versions').select('id,content,visibility').eq('project_id',projectId).eq('id',body.baseVersionId).single();
    if (!base || !isSitePlan(base.content) || base.visibility==='preview') return NextResponse.json({error:'הגרסה לא נמצאה.'},{status:404});
    if ('template' in base.content && !['restore','apply'].includes(body.mode)) return NextResponse.json({error:'הדמו הידני נשמר כפי שהוא. צרו אתר AI חדש כדי לערוך אותו כאן.'},{status:422});
    let plan = structuredClone(base.content);
    let proposal = true;
    if (body.mode === 'restore' || body.mode === 'apply') {
      if (!uuidPattern.test(body.sourceVersionId)) return NextResponse.json({error:'בחרו גרסה.'},{status:422});
      const { data: source } = await client.from('site_versions').select('content,visibility').eq('project_id',projectId).eq('id',body.sourceVersionId).single();
      if (!source || !isSitePlan(source.content) || (body.mode==='apply' && (source.visibility!=='preview' || source.content.revisionOf!==base.id)) || (body.mode==='restore' && source.visibility==='preview')) return NextResponse.json({error:'הגרסה לא נמצאה או שההצעה כבר אינה מתאימה לטיוטה.'},{status:409});
      plan = structuredClone(source.content); delete plan.revisionOf; proposal = false;
    } else if (body.mode === 'theme') {
      plan.theme = themeFor(plan);
      if (['split','editorial','centered'].includes(body.layout)) plan.theme.layout = body.layout;
      if (/^#[0-9a-f]{6}$/i.test(body.accent)) plan.theme.accent = safeAccent(body.accent);
    } else if (body.mode === 'section' || body.mode === 'rewrite') {
      const editingHeader = body.sectionId === 'site-header';
      const index = plan.sections.findIndex(s=>s.id===body.sectionId);
      if (index<0 && !editingHeader) return NextResponse.json({error:'המקטע לא נמצא.'},{status:422});
      let changed = editingHeader ? {id:'site-header',kind:'hero' as const,label:'פתיחת האתר',headline:plan.siteTitle,body:plan.positioning,cta:plan.contactCta,imageId:plan.heroImageId ?? undefined} : plan.sections[index];
      if (body.mode === 'rewrite') {
        const instruction = cleanText(body.instruction,600);
        if (instruction.length<3 || body.consent!==true) return NextResponse.json({error:'כתבו שינוי ואשרו את שליחת המקטע ל־Gemini.'},{status:422});
        const admin = createAdminClient();
        const { data: job, error } = await admin.rpc('slate_start_generation',{p_project:projectId,p_actor:user.id,p_request:body.requestId});
        if (error) throw new Error(error.message);
        if (!job.claimed) {
          if (job.version_id) return NextResponse.json({versionId:job.version_id,proposal:true});
          return NextResponse.json({error:job.state==='running'?'השינוי עדיין בעבודה. חזרו לפרויקט בעוד רגע.':'הניסיון הקודם נכשל. נסו שוב.'},{status:409});
        }
        jobId = job.id;
        changed = await rewriteSection(changed,instruction);
      } else {
        const headline = cleanText(body.headline,180); const content = cleanText(body.body,1200);
        if (!headline || !content) return NextResponse.json({error:'מלאו כותרת ותוכן.'},{status:422});
        changed = {...changed,headline,body:content,cta:cleanText(body.cta,100)||undefined};
        if (body.imageId === '' || plan.images?.some(i=>i.id===body.imageId && i.role!=='logo')) { changed.imageId = body.imageId || undefined; if(editingHeader)plan.heroImageId=body.imageId||null; }
      }
      if(editingHeader){plan.siteTitle=changed.headline;plan.positioning=changed.body;if(changed.cta)plan.contactCta=changed.cta;}
      else {plan.sections[index]=changed;if(changed.kind==='contact')plan.contactCta=changed.headline;}
    } else return NextResponse.json({error:'בחרו שינוי נתמך.'},{status:422});
    if (proposal) plan.revisionOf=base.id;
    const version = await appendVersion(projectId,user.id,plan,base.id,body.requestId,proposal);
    if (jobId) await createAdminClient().from('site_generation_jobs').update({state:'completed',phase:'done',version_id:version.id}).eq('id',jobId);
    return NextResponse.json({versionId:version.id,versionNumber:version.version_number,proposal,plan:version.content});
  } catch(error) {
    const result = workspaceError(error);
    if (jobId) await createAdminClient().from('site_generation_jobs').update({state:'failed',error_message:result.error}).eq('id',jobId).eq('state','running');
    return NextResponse.json({error:result.error},{status:result.status});
  }
}
