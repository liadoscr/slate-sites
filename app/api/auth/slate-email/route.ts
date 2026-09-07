import { NextResponse } from 'next/server';
import { getActiveSlateHandoff, maskEmail, validHandoffId } from '@/lib/auth/slate-handoff';

export async function GET(request: Request) {
  const handoffId = request.headers.get('cookie')?.match(/(?:^|;\s*)slate_handoff=([^;]+)/)?.[1] ?? null;
  if (!validHandoffId(handoffId)) return NextResponse.json({ error: 'No active Slate handoff.' }, { status: 401 });
  const handoff = await getActiveSlateHandoff(handoffId!);
  if (!handoff) return NextResponse.json({ error: 'Slate handoff expired.' }, { status: 410 });
  return NextResponse.json({ email: handoff.email, maskedEmail: maskEmail(handoff.email) }, { headers: { 'Cache-Control': 'no-store' } });
}
