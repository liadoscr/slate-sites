import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { cleanText, uuidPattern, type SiteImage, type GeneratedSitePlan } from './document';
import type { ModelImage } from '@/lib/ai/gemini';

export type ImageChoice = { id: string; role: 'logo' | 'hero' | 'gallery' | 'reference'; alt: string };
export function parseImageChoices(value: unknown): ImageChoice[] {
  if (!Array.isArray(value) || value.length > 6) throw new Error('בחרו עד שש תמונות.');
  const result = value.map(item => {
    if (!item || !uuidPattern.test(item.id) || !['logo','hero','gallery','reference'].includes(item.role)) throw new Error('בחירת התמונה אינה תקינה.');
    const alt = cleanText(item.alt, 180);
    if (!alt) throw new Error('הוסיפו תיאור קצר לכל תמונה שנבחרה.');
    return { id: item.id, role: item.role, alt } as ImageChoice;
  });
  if (new Set(result.map(i => i.id)).size !== result.length || result.filter(i => i.role === 'hero').length > 1 || result.filter(i => i.role === 'logo').length > 1) throw new Error('בחרו לכל היותר תמונה ראשית אחת ולוגו אחד.');
  return result;
}
export function imageMime(bytes: Uint8Array): string | null {
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if ([137,80,78,71,13,10,26,10].every((n,i) => bytes[i] === n)) return 'image/png';
  if (Buffer.from(bytes.slice(0,4)).toString() === 'RIFF' && Buffer.from(bytes.slice(8,12)).toString() === 'WEBP') return 'image/webp';
  return null;
}
export async function selectedImages(projectId: string, choices: ImageChoice[]) {
  const client = await createClient();
  const images: Array<{ model: ModelImage; choice: ImageChoice; bytes: Buffer }> = [];
  let total = 0;
  for (const choice of choices) {
    const { data: asset, error } = await client.from('project_assets').select('storage_path,size_bytes').eq('project_id',projectId).eq('id',choice.id).single();
    if (error || !asset || !asset.storage_path.startsWith(`${projectId}/`) || asset.storage_path.includes('..') || asset.size_bytes > 8*1024*1024) throw new Error('תמונה לא נמצאה או גדולה מ־8MB. העלו תמונה קטנה יותר.');
    // Download with the owner's RLS-scoped client, never an arbitrary URL.
    const { data, error: downloadError } = await client.storage.from('project-assets').download(asset.storage_path);
    if (downloadError || !data || data.size > 8*1024*1024) throw new Error('לא הצלחנו לקרוא תמונה שנבחרה.');
    total += data.size;
    if (total > 12*1024*1024) throw new Error('התמונות שנבחרו גדולות מדי יחד. בחרו פחות תמונות (עד 12MB יחד).');
    const bytes = Buffer.from(await data.arrayBuffer());
    const mimeType = imageMime(bytes);
    if (!mimeType) throw new Error('ליצירה עם AI בחרו תמונות JPG, PNG או WebP בלבד.');
    images.push({ model: { ...choice, mimeType, data: bytes.toString('base64') }, choice, bytes });
  }
  return images;
}
export async function snapshotImages(projectId: string, requestId: string, images: Awaited<ReturnType<typeof selectedImages>>): Promise<SiteImage[]> {
  const admin = createAdminClient();
  const snapshots: SiteImage[] = [];
  for (const image of images) {
    if (image.choice.role === 'reference') continue;
    const path = `${projectId}/${requestId}/${image.choice.id}`;
    const { error } = await admin.storage.from('site-version-assets').upload(path, image.bytes, { contentType: image.model.mimeType, upsert: false });
    if (error) throw new Error('לא הצלחנו לשמור עותק של התמונה. נסו שוב.');
    snapshots.push({ id: image.choice.id, path, role: image.choice.role, alt: image.choice.alt, mimeType: image.model.mimeType });
  }
  return snapshots;
}
export async function appendVersion(projectId: string, userId: string, content: GeneratedSitePlan, expected: string | null, requestId: string, proposal = false) {
  const { data, error } = await createAdminClient().rpc('slate_append_version', { p_project:projectId,p_actor:userId,p_content:content,p_expected:expected,p_request:requestId,p_proposal:proposal });
  if (error) throw new Error(error.message);
  return data as { id: string; version_number: number; content: GeneratedSitePlan };
}
export function workspaceError(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  if (/VERSION_CONFLICT/.test(message)) return { error: 'הפרויקט השתנה בחלון אחר. רעננו לפני שמירת השינוי.', status:409 };
  if (/DAILY_LIMIT/.test(message)) return { error:'הגעתם למכסת היצירות ל־24 השעות האחרונות. נסו שוב מאוחר יותר.', status:429 };
  if (/GENERATION_BUSY/.test(message)) return { error:'כבר מתבצעת יצירה בפרויקט. המתינו לסיום ורעננו.', status:409 };
  if (/GENERATION_EXPIRED/.test(message)) return { error:'היצירה לא הסתיימה בזמן ולכן לא החליפה את הטיוטה. אפשר לנסות שוב.', status:409 };
  if (/schema cache|does not exist|Could not find the function/.test(message)) return { error:'נדרש עדכון מסד הנתונים של Slate. הפרויקט והחומרים שלכם נשמרו.', status:503 };
  if (/GEMINI_API_KEY/.test(message)) return { error:'שירות ה־AI עדיין לא הוגדר.', status:503 };
  return { error: /[\u0590-\u05ff]/.test(message) ? message : 'לא הצלחנו להשלים את הפעולה. התוכן הקודם נשמר; אפשר לנסות שוב.', status:502 };
}
