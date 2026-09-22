import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { defaultCreationSettings, type CreationSettings } from './types';
import { parseCreationSettings } from './validation';

export async function loadCreationSettings(projectId: string): Promise<CreationSettings> {
  const client = await createClient();
  const { data, error } = await client.from('project_activity').select('details').eq('project_id', projectId)
    .eq('event_type', 'creation_settings_saved').order('created_at', { ascending: false }).order('id', { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return defaultCreationSettings();
  const settings = parseCreationSettings(data.details);
  if (data.details.analysis && settings.referenceAssetId) settings.analysis = data.details.analysis;
  return settings;
}

/** Uses the owner's scoped client to validate every selection, including private-only references. */
export async function validateCreationAssets(projectId: string, settings: CreationSettings) {
  if (!settings.images.length) return;
  const client = await createClient();
  const { data, error } = await client.from('project_assets').select('id,storage_path,size_bytes,mime_type')
    .eq('project_id', projectId).in('id', settings.images.map(image => image.id));
  if (error) throw new Error(error.message);
  let total = 0;
  for (const image of settings.images) {
    const asset = data?.find(item => item.id === image.id);
    if (!asset || !asset.storage_path.startsWith(`${projectId}/`) || asset.storage_path.includes('..')) throw new Error('אחת התמונות אינה שייכת לפרויקט.');
    if (asset.storage_path.startsWith(`${projectId}/reference/`) && image.role !== 'reference') throw new Error('תמונת השראה נשארת פרטית ואינה תמונת עסק לפרסום.');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(asset.mime_type) || asset.size_bytes > 8 * 1024 * 1024) throw new Error('בחרו תמונות JPG, PNG או WebP בגודל מתאים.');
    total += Number(asset.size_bytes);
  }
  if (total > 12 * 1024 * 1024) throw new Error('בחרו תמונות בגודל כולל של עד 12MB.');
}

export async function saveCreationSettings(projectId: string, userId: string, settings: CreationSettings): Promise<CreationSettings> {
  const canonical = parseCreationSettings(settings);
  if (canonical.referenceAssetId && settings.analysis) canonical.analysis = settings.analysis;
  const client = await createClient();
  const { data: project } = await client.from('projects').select('id').eq('id', projectId).eq('owner_id', userId).maybeSingle();
  if (!project) throw new Error('הפרויקט לא נמצא.');
  await validateCreationAssets(projectId, canonical);
  const { error } = await createAdminClient().from('project_activity').insert({ project_id: projectId, actor_id: userId, event_type: 'creation_settings_saved', details: canonical });
  if (error) throw new Error(error.message);
  return canonical;
}
