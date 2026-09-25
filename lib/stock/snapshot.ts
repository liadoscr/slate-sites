import 'server-only';
import { randomUUID } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import type { GeneratedSitePlan, SiteImage } from '@/lib/sites/document';
import { stockAttributionFor } from './attribution';
import { findStockPhotos } from './pexels';

/** Pexels photos are stored privately with the version and never sent to Gemini. */
export async function snapshotStockPhotos(projectId: string, jobId: string, queries: string[], limit: number): Promise<SiteImage[]> {
  const photos = await findStockPhotos(queries, Math.min(3, limit));
  const storage = createAdminClient().storage.from('site-version-assets');
  const snapshots: SiteImage[] = [];
  try {
    for (const photo of photos) {
      const attribution = stockAttributionFor(photo.attribution);
      if (!attribution) continue;
      const id = randomUUID();
      const path = `${projectId}/${jobId}/${id}`;
      const { error } = await storage.upload(path, photo.bytes, { contentType: photo.mimeType, upsert: false });
      if (error) throw new Error('לא הצלחנו לשמור את תמונות המאגר. אפשר להוסיף תמונות בתצוגה המקדימה.');
      snapshots.push({ id, path, role: 'gallery', mimeType: photo.mimeType, alt: `צילום מאגר להמחשה: ${photo.alt}`.slice(0, 180), attribution });
    }
    return snapshots;
  } catch (error) {
    // Only clean up new, unpublished objects from this failed snapshot attempt.
    if (snapshots.length) await storage.remove(snapshots.map(image => image.path));
    throw error;
  }
}

export function placeStockPhotos(plan: GeneratedSitePlan, stock: SiteImage[]) {
  if (!stock.length) return;
  const original = plan.images ?? [];
  const needsHero = !original.some(image => image.role === 'hero' || image.role === 'gallery');
  plan.images = [...original, ...stock.map((image, index) => ({ ...image, role: needsHero && index === 0 ? 'hero' as const : 'gallery' as const }))];
  if (needsHero) plan.heroImageId = stock[0].id;
  const remaining = needsHero ? stock.slice(1) : stock;
  let index = 0;
  for (const section of plan.sections) {
    if (section.imageId || !['services', 'gallery'].includes(section.kind ?? '') || index >= remaining.length) continue;
    section.imageId = remaining[index++].id;
    if (section.kind === 'gallery') {
      section.label = 'תמונות להמחשה'; section.headline = 'השראה ואווירה';
      section.body = 'תמונות מאגר להמחשה בלבד — אינן מתעדות את העסק או עבודות שבוצעו בו.';
    }
  }
  plan.reviewNotes = [...plan.reviewNotes, 'התמונות נבחרו ממאגר Pexels להמחשה בלבד. בדקו שהן מתאימות; אפשר להחליף בתמונות אמיתיות שלכם לפני הפרסום.'].slice(-6);
}
