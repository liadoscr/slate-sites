import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getActiveSlateHandoff, normalizeEmail, validHandoffId } from '@/lib/auth/slate-handoff';

function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  return Boolean(origin && origin === new URL(request.url).origin);
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const handoffId = request.headers.get('cookie')?.match(/(?:^|;\s*)slate_handoff=([^;]+)/)?.[1] ?? null;
  if (!validHandoffId(handoffId)) return NextResponse.json({ error: 'No active Slate handoff.' }, { status: 401 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: 'Sign-in is required.' }, { status: 401 });

  const handoff = await getActiveSlateHandoff(handoffId!);
  if (!handoff || normalizeEmail(user.email) !== normalizeEmail(handoff.email)) {
    return NextResponse.json({ error: 'The verified email does not match the Slate handoff.' }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: consumed, error } = await admin
    .from('slate_handoffs')
    .update({ consumed_at: new Date().toISOString(), authenticated_user_id: user.id })
    .eq('id', handoff.id)
    .is('consumed_at', null)
    .gt('expires_at', new Date().toISOString())
    .select('id')
    .maybeSingle();
  if (error || !consumed) return NextResponse.json({ error: 'Slate handoff has already been used or expired.' }, { status: 410 });

  await admin.from('login_events').insert({ user_id: user.id, source: 'slate' });
  const response = NextResponse.json({ ok: true });
  response.cookies.set('slate_handoff', '', { httpOnly: true, path: '/', maxAge: 0 });
  return response;
}
