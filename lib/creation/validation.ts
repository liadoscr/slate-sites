import { cleanText, motionFor, uuidPattern } from '@/lib/sites/document';
import { defaultCreationSettings, type CreationSettings, type FocalPoint } from './types';

export function parseFocalPoint(value: unknown): FocalPoint | undefined {
  if (value == null) return undefined;
  if (typeof value !== 'object') throw new Error('נקודת המיקוד בתמונה אינה תקינה.');
  const input = value as Record<string, unknown>;
  const values = ['x', 'y', 'mobileX', 'mobileY'].map(key => input[key]);
  if (!values.every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 100)) throw new Error('נקודת המיקוד בתמונה אינה תקינה.');
  return Object.fromEntries(['x', 'y', 'mobileX', 'mobileY'].map((key, i) => [key, values[i]])) as FocalPoint;
}

export function parseCreationSettings(value: unknown): CreationSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('הגדרות היצירה אינן תקינות.');
  const input = value as Record<string, any>;
  const defaults = defaultCreationSettings();
  if (!Array.isArray(input.images) || input.images.length > 6) throw new Error('בחרו עד שש תמונות בסך הכול.');
  const images = input.images.map((item: any) => {
    if (!item || !uuidPattern.test(item.id) || !['reference', 'logo', 'hero', 'gallery'].includes(item.role)) throw new Error('בחירת התמונה אינה תקינה.');
    const alt = cleanText(item.alt, 180);
    if (!alt) throw new Error('הוסיפו תיאור קצר לכל תמונה.');
    const focalPoint = parseFocalPoint(item.focalPoint);
    return { id: String(item.id), role: item.role, alt, ...(focalPoint ? { focalPoint } : {}) };
  });
  if (new Set(images.map(i => i.id)).size !== images.length) throw new Error('תמונה נבחרה יותר מפעם אחת.');
  for (const role of ['reference', 'logo', 'hero']) if (images.filter(i => i.role === role).length > 1) throw new Error('בחרו תמונת השראה אחת, לוגו אחד ותמונה ראשית אחת לכל היותר.');
  const reference = images.find(i => i.role === 'reference');
  if ((input.referenceAssetId ?? null) !== (reference?.id ?? null)) throw new Error('בחרו מחדש את תמונת ההשראה.');
  const brandColor = cleanText(input.brandColor, 7);
  if (brandColor && !/^#[0-9a-f]{6}$/i.test(brandColor)) throw new Error('צבע המותג אינו תקין.');
  return {
    schemaVersion: 1,
    creationMode: input.creationMode === 'automatic' ? 'automatic' : 'guided',
    imageSource: input.imageSource === 'stock' ? 'stock' : 'uploads',
    referenceAssetId: reference?.id ?? null,
    referenceFocus: ['structure', 'colors', 'both'].includes(input.referenceFocus) ? input.referenceFocus : defaults.referenceFocus,
    starter: ['minimal', 'editorial', 'bold'].includes(input.starter) ? input.starter : defaults.starter,
    motion: motionFor(input.motion),
    brandColor, notes: cleanText(input.notes, 1200),
    contactPreference: ['whatsapp', 'phone', 'email', 'form'].includes(input.contactPreference) ? input.contactPreference : defaults.contactPreference,
    images,
    locks: { design: input.locks?.design === true, text: input.locks?.text === true },
  };
}
