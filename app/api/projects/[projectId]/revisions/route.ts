import { NextResponse } from 'next/server';
import { readJson } from '@/lib/http/request';
import { getCurrentUser } from '@/lib/data/current-user';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redesignSection, rewriteSection } from '@/lib/ai/gemini';
import { loadCreationSettings } from '@/lib/creation/server';
import { cleanText, focalPointFor, isSitePlan, themeFor, safeAccent, safeEmail, safePhone, whatsappNumber, uuidPattern, type SiteSection } from '@/lib/sites/document';
import { revisionLockError } from '@/lib/sites/revision-locks';
import { appendVersion, workspaceError } from '@/lib/sites/workspace-server';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({ error: 'בקשה לא תקינה.' }, { status: 403 });
  const { projectId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'צריך להתחבר.' }, { status: 401 });
  if (!uuidPattern.test(projectId)) return NextResponse.json({ error: 'לא נמצא.' }, { status: 404 });
  let jobId: string | undefined;
  try {
    const body = await readJson(request);
    if (!uuidPattern.test(body.baseVersionId) || !uuidPattern.test(body.requestId)) return NextResponse.json({ error: 'רעננו את הפרויקט ונסו שוב.' }, { status: 422 });
    const client = await createClient();
    const { data: project } = await client.from('projects').select('id').eq('id', projectId).eq('owner_id', user.id).maybeSingle();
    if (!project) return NextResponse.json({ error: 'הפרויקט לא נמצא.' }, { status: 404 });
    const { data: base } = await client.from('site_versions').select('id,content,visibility').eq('project_id', projectId).eq('id', body.baseVersionId).single();
    if (!base || !isSitePlan(base.content) || base.visibility === 'preview') return NextResponse.json({ error: 'הגרסה לא נמצאה.' }, { status: 404 });
    if ('template' in base.content && !['restore', 'apply'].includes(body.mode)) return NextResponse.json({ error: 'הדמו הידני נשמר כפי שהוא. צרו אתר AI חדש כדי לערוך אותו כאן.' }, { status: 422 });
    const settings = await loadCreationSettings(projectId);
    if ((body.mode === 'rewrite' && settings.locks.text) || (body.mode === 'redesign' && settings.locks.design)) return NextResponse.json({ error: body.mode === 'rewrite' ? 'התוכן נעול. בטלו את הנעילה לפני בקשת שינוי.' : 'העיצוב נעול. בטלו את הנעילה לפני בקשת שינוי.' }, { status: 409 });
    let plan = structuredClone(base.content);
    let proposal = true;
    if (body.mode === 'restore' || body.mode === 'apply') {
      if (!uuidPattern.test(body.sourceVersionId)) return NextResponse.json({ error: 'בחרו גרסה.' }, { status: 422 });
      const { data: source } = await client.from('site_versions').select('content,visibility').eq('project_id', projectId).eq('id', body.sourceVersionId).single();
      if (!source || !isSitePlan(source.content) || (body.mode === 'apply' && (source.visibility !== 'preview' || source.content.revisionOf !== base.id)) || (body.mode === 'restore' && source.visibility === 'preview')) return NextResponse.json({ error: 'הגרסה לא נמצאה או שההצעה כבר אינה מתאימה לטיוטה.' }, { status: 409 });
      plan = structuredClone(source.content);
      delete plan.revisionOf;
      proposal = false;
    } else if (body.mode === 'theme') {
      if ('motion' in body && !['off', 'subtle', 'expressive'].includes(body.motion)) return NextResponse.json({ error: 'בחרו סגנון אנימציה נתמך.' }, { status: 422 });
      plan.theme = themeFor(plan);
      if ('motion' in body) plan.theme.motion = body.motion;
      if (['split', 'editorial', 'centered', 'immersive', 'bento'].includes(body.layout)) plan.theme.layout = body.layout;
      if (['light', 'dark'].includes(body.colorMode)) plan.theme.mode = body.colorMode;
      if (['airy', 'compact'].includes(body.density)) plan.theme.density = body.density;
      if (['modern', 'editorial'].includes(body.font)) plan.theme.font = body.font;
      if (['soft', 'square'].includes(body.corners)) plan.theme.corners = body.corners;
      plan.theme.accent = safeAccent(/^#[0-9a-f]{6}$/i.test(body.accent) ? body.accent : plan.theme.accent, plan.theme.mode);
    } else if (body.mode === 'seo') {
      const title = cleanText(body.title, 160);
      const description = cleanText(body.description, 320);
      if (!title || !description) return NextResponse.json({ error: 'הוסיפו כותרת ותיאור לתוצאות החיפוש.' }, { status: 422 });
      plan.seo = { ...plan.seo, title, description };
    } else if (body.mode === 'contact') {
      const phone = safePhone(body.phone);
      const email = safeEmail(body.email);
      if ((cleanText(body.phone) && !phone) || (cleanText(body.email) && !email)) return NextResponse.json({ error: 'בדקו שהטלפון והאימייל תקינים.' }, { status: 422 });
      if (!plan.business || !['whatsapp', 'phone', 'email', 'form'].includes(body.contactPreference)) return NextResponse.json({ error: 'בחרו דרך יצירת קשר.' }, { status: 422 });
      const whatsapp = body.whatsapp === true && phone ? whatsappNumber(phone) : '';
      if ((body.contactPreference === 'whatsapp' && !whatsapp) || (body.contactPreference === 'phone' && !phone) || (body.contactPreference === 'email' && !email)) return NextResponse.json({ error: 'השלימו את פרטי הקשר של הפעולה הראשית שבחרתם.' }, { status: 422 });
      plan.business = { ...plan.business, phone, email, whatsapp };
      plan.contactPreference = body.contactPreference;
    } else if (body.mode === 'image') {
      const image = plan.images?.find(item => item.id === body.imageId && ['logo', 'hero', 'gallery'].includes(item.role));
      if (!image) return NextResponse.json({ error: 'התמונה אינה נמצאת בגרסה הזו.' }, { status: 422 });
      if ('alt' in body) {
        const alt = cleanText(body.alt, 180);
        if (!alt) return NextResponse.json({ error: 'תארו בקצרה מה מופיע בתמונה.' }, { status: 422 });
        image.alt = alt;
      }
      if ('focalPoint' in body) {
        const focal = body.focalPoint;
        if (!focal || typeof focal !== 'object' || !['x', 'y', 'mobileX', 'mobileY'].every(key => typeof focal[key] === 'number' && Number.isFinite(focal[key]) && focal[key] >= 0 && focal[key] <= 100)) return NextResponse.json({ error: 'נקודת המיקוד חייבת להיות בין 0 ל־100 בכל ציר.' }, { status: 422 });
        image.focalPoint = focalPointFor({ ...image, focalPoint: focal });
      }
    } else if (['section', 'rewrite', 'section-design', 'redesign'].includes(body.mode)) {
      const editingHeader = body.sectionId === 'site-header';
      const index = plan.sections.findIndex(section => section.id === body.sectionId);
      if (index < 0 && !editingHeader) return NextResponse.json({ error: 'המקטע לא נמצא.' }, { status: 422 });
      const original: SiteSection = editingHeader ? { id: 'site-header', kind: 'hero', label: 'פתיחת האתר', headline: plan.siteTitle, body: plan.positioning, cta: plan.contactCta, imageId: plan.heroImageId ?? undefined } : plan.sections[index];
      let changed = { ...original };
      if (body.mode === 'rewrite' || body.mode === 'redesign') {
        if (body.mode === 'redesign' && (editingHeader || original.kind === 'hero' || original.kind === 'contact')) return NextResponse.json({ error: 'בחרו מקטע תוכן לשינוי עיצוב ממוקד. את פתיחת האתר משנים בכיוון העיצובי של האתר.' }, { status: 422 });
        const instruction = cleanText(body.instruction, 600);
        if (instruction.length < 3 || body.consent !== true) return NextResponse.json({ error: 'כתבו שינוי ואשרו את שליחת המקטע ל־Gemini.' }, { status: 422 });
        const admin = createAdminClient();
        const { data: job, error } = await admin.rpc('slate_start_generation', { p_project: projectId, p_actor: user.id, p_request: body.requestId });
        if (error) throw new Error(error.message);
        if (!job.claimed) {
          if (job.version_id) {
            const { data: previous } = await client.from('site_versions').select('id,content,version_number').eq('project_id', projectId).eq('id', job.version_id).maybeSingle();
            if (previous) return NextResponse.json({ versionId: previous.id, versionNumber: previous.version_number, proposal: true, plan: previous.content });
          }
          return NextResponse.json({ error: job.state === 'running' ? 'השינוי עדיין בעבודה. חזרו לפרויקט בעוד רגע.' : 'הניסיון הקודם נכשל. נסו שוב.' }, { status: 409 });
        }
        jobId = job.id;
        if (body.mode === 'rewrite') {
          const rewritten = await rewriteSection(original, instruction);
          changed = { ...original, headline: rewritten.headline, body: rewritten.body, cta: rewritten.cta };
        } else {
          const redesigned = await redesignSection(original, instruction, themeFor(plan));
          changed = { ...original, presentation: redesigned.presentation };
        }
      } else if (body.mode === 'section') {
        const headline = cleanText(body.headline, 180);
        const content = cleanText(body.body, 1200);
        if (!headline || !content || (editingHeader && !cleanText(body.cta, 100))) return NextResponse.json({ error: 'מלאו כותרת, תוכן וטקסט לכפתור הראשי.' }, { status: 422 });
        changed = { ...original, headline, body: content, cta: cleanText(body.cta, 100) || undefined };
      } else if (!editingHeader) {
        if (!['split', 'cards', 'band'].includes(body.layout) || !['default', 'muted', 'accent'].includes(body.tone)) return NextResponse.json({ error: 'בחרו מבנה ורקע למקטע.' }, { status: 422 });
        changed.presentation = { layout: body.layout, tone: body.tone };
      }
      // Legacy combined requests are still checked against both stored locks below.
      if ((body.mode === 'section' || body.mode === 'section-design') && 'imageId' in body) {
        if (body.imageId !== '' && !plan.images?.some(image => image.id === body.imageId && ['hero', 'gallery'].includes(image.role))) return NextResponse.json({ error: 'בחרו תמונה ששייכת לגרסה הזו.' }, { status: 422 });
        changed.imageId = body.imageId || undefined;
        if (editingHeader) plan.heroImageId = body.imageId || null;
      }
      if (editingHeader) {
        plan.siteTitle = changed.headline;
        plan.positioning = changed.body;
        if (changed.cta) plan.contactCta = changed.cta;
      } else {
        plan.sections[index] = changed;
        if (body.mode !== 'section-design' && body.mode !== 'redesign' && changed.kind === 'contact') plan.contactCta = changed.headline;
      }
    } else return NextResponse.json({ error: 'בחרו שינוי נתמך.' }, { status: 422 });

    const initialLockError = revisionLockError(base.content, plan, settings.locks);
    // A field may be locked in another tab while the AI request is running.
    const currentSettings = await loadCreationSettings(projectId);
    const lockError = initialLockError || revisionLockError(base.content, plan, currentSettings.locks);
    if (lockError) {
      if (jobId) await createAdminClient().from('site_generation_jobs').update({ state: 'failed', error_message: lockError }).eq('id', jobId).eq('state', 'running');
      return NextResponse.json({ error: lockError }, { status: 409 });
    }
    if (proposal) plan.revisionOf = base.id;
    const version = await appendVersion(projectId, user.id, plan, base.id, body.requestId, proposal);
    if (jobId) await createAdminClient().from('site_generation_jobs').update({ state: 'completed', phase: 'done', version_id: version.id }).eq('id', jobId);
    return NextResponse.json({ versionId: version.id, versionNumber: version.version_number, proposal, plan: version.content });
  } catch (error) {
    const result = workspaceError(error);
    if (jobId) await createAdminClient().from('site_generation_jobs').update({ state: 'failed', error_message: result.error }).eq('id', jobId).eq('state', 'running');
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
