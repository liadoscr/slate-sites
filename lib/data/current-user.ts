import 'server-only';

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

/** A request-scoped, verified user lookup for server pages and route handlers. */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return error ? null : user;
});
