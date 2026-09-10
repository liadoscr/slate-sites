import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ projectId: string }> };
type ContactPayload = { name?: unknown; email?: unknown; phone?: unknown; message?: unknown; website?: unknown };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const attempts = new Map<string, { count: number; resetAt: number }>();

function text(value: unknown, maximum: number) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maximum) : '';
}

function rateLimitKey(request: Request, projectId: string) {
  const address = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  return `${projectId}:${address}`;
}

function isAllowed(request: Request, projectId: string) {
  const key = rateLimitKey(request, projectId);
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt <= now) { attempts.set(key, { count: 1, resetAt: now + 15 * 60_000 }); return true; }
  if (entry.count >= 5) return false;
  entry.count += 1;
  return true;
}

export async function POST(request: Request, { params }: RouteContext) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) return NextResponse.json({ error: 'בקשה לא תקינה.' }, { status: 403 });
  const { projectId } = await params;
  if (!uuidPattern.test(projectId)) return NextResponse.json({ error: 'האתר לא נמצא.' }, { status: 404 });
  if (!isAllowed(request, projectId)) return NextResponse.json({ error: 'נשלחו יותר מדי פניות. נסו שוב בעוד כמה דקות.' }, { status: 429 });

  let payload: ContactPayload;
  try { payload = await request.json() as ContactPayload; } catch { return NextResponse.json({ error: 'פרטי הפנייה אינם תקינים.' }, { status: 400 }); }
  if (text(payload.website, 200)) return NextResponse.json({ ok: true });

  const name = text(payload.name, 100);
  const email = text(payload.email, 254).toLowerCase();
  const phone = text(payload.phone, 40);
  const message = text(payload.message, 2_000);
  if (name.length < 2 || !emailPattern.test(email) || message.length < 2) return NextResponse.json({ error: 'מלאו שם, אימייל והודעה תקינים.' }, { status: 422 });

  const admin = createAdminClient();
  const { data: version } = await admin.from('site_versions').select('id').eq('project_id', projectId).eq('visibility', 'public').limit(1).maybeSingle();
  if (!version) return NextResponse.json({ error: 'האתר אינו מקבל פניות כרגע.' }, { status: 404 });
  const { error } = await admin.from('project_activity').insert({
    project_id: projectId,
    event_type: 'public_contact_received',
    details: { name, email, phone: phone || null, message, receivedAt: new Date().toISOString() },
  });
  if (error) return NextResponse.json({ error: 'לא הצלחנו לשלוח את הפנייה. נסו שוב.' }, { status: 502 });
  return NextResponse.json({ ok: true });
}
