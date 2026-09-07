import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { requireSupabasePublicConfig } from './env';

/** Server-only client. Never import this module into a Client Component. */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured.');

  const { url } = requireSupabasePublicConfig();
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
