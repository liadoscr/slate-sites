import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { appUrl, isEmail, normalizeEmail } from '@/lib/auth/slate-handoff';
import { createAdminClient } from '@/lib/supabase/admin';

const fiveMinutes = 5 * 60 * 1000;
const tenMinutes = 10 * 60 * 1000;

function validSignature(payload: string, timestamp: string, signature: string | null) {
  const secret = process.env.SLATE_HANDOFF_HMAC_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
  const received = signature.replace(/^sha256=/, '');
  const expectedBuffer = Buffer.from(expected, 'hex');
  const receivedBuffer = Buffer.from(received, 'hex');
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

/**
 * Server-to-server endpoint used by Slate. Slate signs `timestamp.rawBody` with
 * SLATE_HANDOFF_HMAC_SECRET and receives an opaque, one-time browser URL.
 */
export async function POST(request: Request) {
  const timestamp = request.headers.get('x-slate-timestamp');
  const signature = request.headers.get('x-slate-signature');
  const rawBody = await request.text();
  const timestampMs = Number(timestamp);

  if (!timestamp || !Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > fiveMinutes || !validSignature(rawBody, timestamp, signature)) {
    return NextResponse.json({ error: 'Unauthorized Slate handoff.' }, { status: 401 });
  }

  let body: { email?: unknown; slate_user_reference?: unknown };
  try { body = JSON.parse(rawBody) as { email?: unknown; slate_user_reference?: unknown }; }
  catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }

  const email = typeof body.email === 'string' ? normalizeEmail(body.email) : '';
  const slateUserReference = typeof body.slate_user_reference === 'string' ? body.slate_user_reference.slice(0, 200) : null;
  if (!isEmail(email)) return NextResponse.json({ error: 'A valid email is required.' }, { status: 422 });

  const admin = createAdminClient();
  const expiresAt = new Date(Date.now() + tenMinutes).toISOString();
  const { data, error } = await admin
    .from('slate_handoffs')
    .insert({ email, slate_user_reference: slateUserReference, expires_at: expiresAt })
    .select('id, expires_at')
    .single();
  if (error || !data) return NextResponse.json({ error: 'Could not create handoff.' }, { status: 500 });

  const continueUrl = `${appUrl(request.url)}/auth/slate?handoff=${data.id}`;
  return NextResponse.json({ handoff_id: data.id, continue_url: continueUrl, expires_at: data.expires_at }, { status: 201 });
}
