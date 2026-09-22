import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/data/current-user';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { readJson } from '@/lib/http/request';
import { uuidPattern } from '@/lib/sites/document';
import { selectedImages, workspaceError } from '@/lib/sites/workspace-server';
import { loadCreationSettings, saveCreationSettings } from '@/lib/creation/server';
import { analyzeReferenceImage } from '@/lib/ai/gemini';

export const runtime = 'nodejs';
export const maxDuration = 120;
type Context = { params: Promise<{ projectId: string }> };
export async function POST(request: Request, { params }: Context) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({ error: 'בקשה לא תקינה.' }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'צריך להתחבר.' }, { status: 401 });
  const { projectId } = await params;
  if (!uuidPattern.test(projectId)) return NextResponse.json({ error: 'הפרויקט לא נמצא.' }, { status: 404 });
  let claimedId: string | null = null;
  const admin = createAdminClient();
  try {
    const body = await readJson(request);
    if (!uuidPattern.test(body.requestId) || body.consent !== true) return NextResponse.json({ error: 'אשרו שליחת תמונת ההשראה ל־Gemini לניתוח.' }, { status: 422 });
    const client = await createClient();
    const { data: project } = await client.from('projects').select('id').eq('id', projectId).eq('owner_id', user.id).maybeSingle();
    if (!project) return NextResponse.json({ error: 'הפרויקט לא נמצא.' }, { status: 404 });
    const settings = await loadCreationSettings(projectId);
    const reference = settings.images.find(image => image.id === settings.referenceAssetId && image.role === 'reference');
    if (!reference) return NextResponse.json({ error: 'העלו ובחרו תמונת השראה לפני הניתוח.' }, { status: 422 });
    // Reuse the same per-user quota and project lease as generation.
    const { data: job, error } = await admin.rpc('slate_start_generation', { p_project: projectId, p_actor: user.id, p_request: body.requestId });
    if (error) throw new Error(error.message);
    if (!job.claimed) {
      if (job.state === 'completed' && settings.analysis) return NextResponse.json({ analysis: settings.analysis, settings });
      return NextResponse.json({ error: 'הניתוח כבר התחיל או הסתיים. רעננו את הפרויקט.' }, { status: 409 });
    }
    claimedId = job.id;
    const [image] = await selectedImages(projectId, [reference]);
    await admin.from('site_generation_jobs').update({ phase: 'designing' }).eq('id', job.id);
    const analysis = await analyzeReferenceImage(image.model);
    if (Date.now() > new Date(job.expires_at).getTime()) throw new Error('GENERATION_EXPIRED');
    const current = await loadCreationSettings(projectId);
    if (current.referenceAssetId !== reference.id) throw new Error('תמונת ההשראה הוחלפה בזמן הניתוח. נתחו את התמונה החדשה.');
    current.analysis = analysis;
    await saveCreationSettings(projectId, user.id, current);
    await admin.from('site_generation_jobs').update({ state: 'completed', phase: 'done' }).eq('id', job.id).eq('state', 'running');
    return NextResponse.json({ analysis, settings: current }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const result = workspaceError(error);
    if (claimedId) await admin.from('site_generation_jobs').update({ state: 'failed', error_message: result.error }).eq('id', claimedId).eq('state', 'running');
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
