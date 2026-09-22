import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/data/current-user';
import { createClient } from '@/lib/supabase/server';
import { readJson } from '@/lib/http/request';
import { uuidPattern } from '@/lib/sites/document';
import { workspaceError } from '@/lib/sites/workspace-server';
import { loadCreationSettings, saveCreationSettings } from '@/lib/creation/server';
import { parseCreationSettings } from '@/lib/creation/validation';

type Context = { params: Promise<{ projectId: string }> };
async function owner(projectId: string) {
  const user = await getCurrentUser();
  if (!user || !uuidPattern.test(projectId)) return null;
  const client = await createClient();
  const { data } = await client.from('projects').select('id').eq('id', projectId).eq('owner_id', user.id).maybeSingle();
  return data ? user : null;
}
export async function GET(_request: Request, { params }: Context) {
  const { projectId } = await params;
  if (!await owner(projectId)) return NextResponse.json({ error: 'הפרויקט לא נמצא.' }, { status: 404 });
  try { return NextResponse.json({ settings: await loadCreationSettings(projectId) }, { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { const result = workspaceError(error); return NextResponse.json({ error: result.error }, { status: result.status }); }
}
export async function PUT(request: Request, { params }: Context) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({ error: 'בקשה לא תקינה.' }, { status: 403 });
  const { projectId } = await params;
  const user = await owner(projectId);
  if (!user) return NextResponse.json({ error: 'הפרויקט לא נמצא.' }, { status: 404 });
  try {
    const body = await readJson(request);
    const settings = parseCreationSettings(body.settings);
    const existing = await loadCreationSettings(projectId);
    settings.locks = existing.locks;
    // Analysis is server-generated and belongs only to the image that was analyzed.
    if (existing.referenceAssetId === settings.referenceAssetId) settings.analysis = existing.analysis;
    if (JSON.stringify(settings) !== JSON.stringify(existing)) await saveCreationSettings(projectId, user.id, settings);
    return NextResponse.json({ settings }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { const result = workspaceError(error); return NextResponse.json({ error: result.error }, { status: result.status }); }
}

export async function PATCH(request: Request, { params }: Context) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({ error: 'בקשה לא תקינה.' }, { status: 403 });
  const { projectId } = await params;
  const user = await owner(projectId);
  if (!user) return NextResponse.json({ error: 'הפרויקט לא נמצא.' }, { status: 404 });
  try {
    const body = await readJson(request, 1024);
    if (!body.locks || typeof body.locks.design !== 'boolean' || typeof body.locks.text !== 'boolean') return NextResponse.json({ error: 'בחרו אילו חלקים לנעול.' }, { status: 422 });
    const settings = await loadCreationSettings(projectId);
    settings.locks = { design: body.locks.design, text: body.locks.text };
    await saveCreationSettings(projectId, user.id, settings);
    return NextResponse.json({ settings }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { const result = workspaceError(error); return NextResponse.json({ error: result.error }, { status: result.status }); }
}
