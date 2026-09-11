export type SiteSection = {
  id: string; label: string; headline: string; body: string; cta?: string; notes?: string;
  kind?: 'hero' | 'about' | 'services' | 'gallery' | 'contact'; imageId?: string;
};
export type SiteTheme = { layout: 'split' | 'editorial' | 'centered'; accent: string; font: 'modern' | 'editorial'; corners: 'soft' | 'square' };
export type SiteImage = { id: string; path: string; alt: string; role: 'logo' | 'hero' | 'gallery'; mimeType: string };
export type BusinessSnapshot = { name: string; type: string; location: string; email: string; phone: string; whatsapp: string };
export type GeneratedSitePlan = {
  version: 1; siteTitle: string; positioning: string;
  visualDirection: { summary: string; palette: string[]; typography: string; layout: string };
  sections: SiteSection[]; seo: { title: string; description: string; keywords: string[] };
  contactCta: string; missingInformation: string[]; reviewNotes: string[];
  theme?: SiteTheme; business?: BusinessSnapshot; images?: SiteImage[]; revisionOf?: string; heroImageId?: string | null;
};
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function isSitePlan(value: unknown): value is GeneratedSitePlan {
  if (!value || typeof value !== 'object') return false;
  const p = value as GeneratedSitePlan;
  return Boolean(p.siteTitle && p.positioning && p.seo?.title && Array.isArray(p.sections) && p.sections.length);
}
export function cleanText(value: unknown, limit = 500) {
  return typeof value === 'string' ? value.trim().replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').slice(0, limit) : '';
}
export function safePhone(value: unknown) {
  const phone = cleanText(value, 40).replace(/[\s().-]/g, '');
  return /^\+?[0-9]{8,15}$/.test(phone) ? phone : '';
}
export function safeEmail(value: unknown) {
  const email = cleanText(value, 254);
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) ? email : '';
}
export function whatsappNumber(phone: string) {
  return phone.startsWith('0') ? `972${phone.slice(1)}` : phone.replace(/^\+/, '');
}
export function safeAccent(value: unknown) {
  let hex = typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : '#5048e5';
  const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const luminance = (values: number[]) => values.map(n => { const c = n / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }).reduce((a, n, i) => a + n * [.2126, .7152, .0722][i], 0);
  // White button text and accent text on white must both reach 4.5:1.
  while (luminance(rgb) > .183) for (let i = 0; i < 3; i++) rgb[i] = Math.floor(rgb[i] * .9);
  hex = '#' + rgb.map(n => n.toString(16).padStart(2, '0')).join('');
  return hex;
}
export function themeFor(plan: GeneratedSitePlan): SiteTheme {
  const theme = plan.theme;
  return { layout: ['split', 'editorial', 'centered'].includes(theme?.layout ?? '') ? theme!.layout : 'split', accent: safeAccent(theme?.accent ?? plan.visualDirection?.palette?.find(c => /^#[0-9a-f]{6}$/i.test(c))), font: theme?.font === 'editorial' ? 'editorial' : 'modern', corners: theme?.corners === 'square' ? 'square' : 'soft' };
}
export function launchChecks(plan: GeneratedSitePlan) {
  return [
    { label: 'שם העסק ותוכן ראשי', ok: Boolean(plan.business?.name && plan.siteTitle && plan.sections.length) },
    { label: 'פרטי קשר ישירים (בנוסף לטופס)', ok: Boolean(safePhone(plan.business?.phone) || safeEmail(plan.business?.email)) },
    { label: 'תיאור לתוצאות חיפוש', ok: Boolean(plan.seo?.description) },
    { label: 'תיאורים חלופיים לתמונות', ok: (plan.images ?? []).every(image => Boolean(image.alt.trim())) },
  ];
}
