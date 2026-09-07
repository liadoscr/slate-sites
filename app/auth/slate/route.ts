import { NextResponse } from 'next/server';
import { getActiveSlateHandoff, validHandoffId } from '@/lib/auth/slate-handoff';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const handoffId = url.searchParams.get('handoff');
  const authUrl = new URL('/auth', request.url);

  if (!validHandoffId(handoffId) || !(await getActiveSlateHandoff(handoffId!))) {
    authUrl.searchParams.set('error', 'ההעברה מ־Slate אינה תקפה או שפג תוקפה. אפשר להיכנס עם המייל באופן רגיל.');
    return NextResponse.redirect(authUrl);
  }

  authUrl.searchParams.set('source', 'slate');
  const response = NextResponse.redirect(authUrl);
  response.cookies.set('slate_handoff', handoffId!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60,
  });
  return response;
}
