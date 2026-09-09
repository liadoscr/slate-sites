import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getActiveSlateHandoff, normalizeEmail, validHandoffId } from '@/lib/auth/slate-handoff';
import { getSupabasePublicConfig } from '@/lib/supabase/env';

function safeNextPath(value: string | null) {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/dashboard';
}

function authErrorResponse(request: NextRequest, message: string) {
  const url = new URL('/auth', request.url);
  url.searchParams.set('error', message);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const source = request.nextUrl.searchParams.get('source') === 'slate' ? 'slate' : 'direct';
  const config = getSupabasePublicConfig();

  if (!code || !config) {
    return authErrorResponse(request, 'קישור ההתחברות אינו תקף או שההגדרה חסרה. נסו לבקש קישור חדש.');
  }

  const response = NextResponse.redirect(new URL(safeNextPath(request.nextUrl.searchParams.get('next')), request.url));
  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return authErrorResponse(request, 'קישור ההתחברות פג תוקף או שכבר נעשה בו שימוש. בקשו קישור חדש.');
  }

  const admin = createAdminClient();

  if (source === 'slate') {
    const handoffId = request.cookies.get('slate_handoff')?.value ?? null;
    const handoff = validHandoffId(handoffId) ? await getActiveSlateHandoff(handoffId!) : null;

    if (!handoff || !data.user.email || normalizeEmail(handoff.email) !== normalizeEmail(data.user.email)) {
      return authErrorResponse(request, 'המייל שאומת אינו תואם להעברה מ־Slate.');
    }

    const { data: consumed, error: consumeError } = await admin
      .from('slate_handoffs')
      .update({ consumed_at: new Date().toISOString(), authenticated_user_id: data.user.id })
      .eq('id', handoff.id)
      .is('consumed_at', null)
      .gt('expires_at', new Date().toISOString())
      .select('id')
      .maybeSingle();

    if (consumeError || !consumed) {
      return authErrorResponse(request, 'ההעברה מ־Slate פגה או שכבר נעשה בה שימוש.');
    }

    response.cookies.set('slate_handoff', '', { httpOnly: true, path: '/', maxAge: 0 });
  }

  try {
    await admin.from('login_events').insert({ user_id: data.user.id, source }).throwOnError();
  } catch {
    // Login activity is helpful for auditing, but must not block a valid sign-in.
  }
  return response;
}
