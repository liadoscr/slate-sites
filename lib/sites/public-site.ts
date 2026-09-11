import 'server-only';
import { cache } from 'react';
import { createAdminClient } from '@/lib/supabase/admin';

// Shared by page metadata and rendering; never expose a private version.
export const getPublishedSite = cache(async (projectId: string) => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(projectId)) return null;
  const admin = createAdminClient();
  const { data: project, error: projectError } = await admin.from('projects')
    .select('id, business_name, business_type, location').eq('id', projectId).maybeSingle();
  if (projectError) throw new Error('Could not load the public project.');
  if (!project) return null;
  const { data: version, error } = await admin.from('site_versions').select('content, version_number')
    .eq('project_id', projectId).eq('visibility', 'public')
    .order('version_number', { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error('Could not load the public site version.');
  return version ? { project, version } : null;
});
