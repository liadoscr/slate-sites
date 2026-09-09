import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export type SlateHandoff = {
  id: string;
  email: string;
  slate_user_reference: string | null;
  expires_at: string;
};

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isEmail(value: string) {
  return /^\S+@\S+\.\S+$/.test(value);
}

export function maskEmail(email: string) {
  const [local, domain] = email.split('@');
  if (!local || !domain) return 'כתובת המייל שלך';
  return `${local.slice(0, 1)}${'•'.repeat(Math.min(Math.max(local.length - 1, 2), 5))}@${domain}`;
}

export async function getActiveSlateHandoff(id: string): Promise<SlateHandoff | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('slate_handoffs')
    .select('id, email, slate_user_reference, expires_at')
    .eq('id', id)
    .is('consumed_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error || !data) return null;
  return data as SlateHandoff;
}

export function appUrl(requestUrl?: string) {
  const configured = process.env.SLATE_SITES_APP_URL;
  return (configured || requestUrl || 'http://localhost:3000').replace(/\/$/, '');
}

export function validHandoffId(value: string | null) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}
