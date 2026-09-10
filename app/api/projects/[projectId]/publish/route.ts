import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/data/current-user';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ projectId: string }> };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  return Boolean(origin && origin === new URL(request.url).origin);
}

function publicUrlFor(request: Request, projectId: string) {
  const configured = process.env.SLATE_SITES_APP_URL;
  try {
    const base = configured ? new URL(configured) : new URL(request.url);
    return new URL(`/sites/${projectId}`, base).toString();
  } catch {
    return new URL(`/sites/${projectId}`, request.url).toString();
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'בקשה לא תקינה.' }, { status: 403 });
  const { projectId } = await params;
  if (!uuidPattern.test(projectId)) return NextResponse.json({ error: 'מזהה פרויקט לא תקין.' }, { status: 400 });

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'צריך להתחבר כדי לפרסם אתר.' }, { status: 401 });
  const supabase = await createClient();
  const { data: project } = await supabase.from('projects').select('id').eq('id', projectId).maybeSingle();
  if (!project) return NextResponse.json({ error: 'הפרויקט לא נמצא.' }, { status: 404 });

  const { data: latestVersion } = await supabase.from('site_versions').select('id, version_number').eq('project_id', projectId).order('version_number', { ascending: false }).limit(1).maybeSingle();
  if (!latestVersion) return NextResponse.json({ error: 'צרו קודם תוכנית אתר לפני הפרסום.' }, { status: 422 });

  const publicUrl = publicUrlFor(request, projectId);
  const admin = createAdminClient();
  const { error: versionError } = await admin.from('site_versions').update({ visibility: 'public', published_url: publicUrl }).eq('id', latestVersion.id);
  if (versionError) return NextResponse.json({ error: 'לא הצלחנו לפרסם את גרסת האתר.' }, { status: 502 });
  const { error: projectError } = await admin.from('projects').update({ status: 'published' }).eq('id', projectId);
  if (projectError) return NextResponse.json({ error: 'האתר פורסם, אך לא הצלחנו לעדכן את סטטוס הפרויקט.' }, { status: 502 });
  await admin.from('project_activity').insert({ project_id: projectId, actor_id: user.id, event_type: 'site_published_by_owner', details: { versionNumber: latestVersion.version_number, publicUrl } });

  return NextResponse.json({ publicUrl });
}

export async function DELETE(request: Request, { params }: RouteContext) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'בקשה לא תקינה.' }, { status: 403 });
  const { projectId } = await params;
  if (!uuidPattern.test(projectId)) return NextResponse.json({ error: 'מזהה פרויקט לא תקין.' }, { status: 400 });

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'צריך להתחבר כדי להסיר אתר.' }, { status: 401 });
  const supabase = await createClient();
  const { data: project } = await supabase.from('projects').select('id').eq('id', projectId).maybeSingle();
  if (!project) return NextResponse.json({ error: 'הפרויקט לא נמצא.' }, { status: 404 });

  const admin = createAdminClient();
  const { error: versionError } = await admin.from('site_versions').update({ visibility: 'private', published_url: null }).eq('project_id', projectId).eq('visibility', 'public');
  if (versionError) return NextResponse.json({ error: 'לא הצלחנו להסיר את האתר.' }, { status: 502 });
  const { error: projectError } = await admin.from('projects').update({ status: 'preview_ready' }).eq('id', projectId);
  if (projectError) return NextResponse.json({ error: 'האתר הוסר, אך לא הצלחנו לעדכן את סטטוס הפרויקט.' }, { status: 502 });
  await admin.from('project_activity').insert({ project_id: projectId, actor_id: user.id, event_type: 'site_unpublished_by_owner', details: {} });

  return NextResponse.json({ ok: true });
}
