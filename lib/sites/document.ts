export type SiteSection = {
  id: string; label: string; headline: string; body: string; cta?: string; notes?: string;
  kind?: 'hero' | 'about' | 'services' | 'gallery' | 'contact'; imageId?: string;
  presentation?: { layout: 'split' | 'cards' | 'band'; tone: 'default' | 'muted' | 'accent' };
};
export type SiteLayout = 'split' | 'editorial' | 'centered' | 'immersive' | 'bento';
export type SiteMotion = 'off' | 'subtle' | 'expressive';
export function motionFor(value: unknown): SiteMotion { return value === 'subtle' || value === 'expressive' ? value : 'off'; }
export type SiteTheme = { layout: SiteLayout; accent: string; font: 'modern' | 'editorial'; corners: 'soft' | 'square'; mode?: 'light' | 'dark'; density?: 'airy' | 'compact'; motion?: SiteMotion };
export type SiteImage = { id: string; path: string; alt: string; role: 'logo' | 'hero' | 'gallery'; mimeType: string; attribution?: import('@/lib/stock/attribution').StockAttribution; focalPoint?: { x: number; y: number; mobileX: number; mobileY: number } };
export type BusinessSnapshot = { name: string; type: string; location: string; email: string; phone: string; whatsapp: string };
export type GeneratedSitePlan = {
  version: 1; siteTitle: string; positioning: string;
  visualDirection: { summary: string; palette: string[]; typography: string; layout: string };
  sections: SiteSection[]; seo: { title: string; description: string; keywords: string[] };
  contactCta: string; missingInformation: string[]; reviewNotes: string[];
  theme?: SiteTheme; business?: BusinessSnapshot; images?: SiteImage[]; revisionOf?: string; heroImageId?: string | null;
  contactPreference?: 'whatsapp' | 'phone' | 'email' | 'form';
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
export function colorLuminance(hex: string) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return 0;
  return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4)
    .reduce((sum, n, i) => sum + n * [.2126, .7152, .0722][i], 0);
}
export function contrastRatio(a: string, b: string) {
  const values = [colorLuminance(a), colorLuminance(b)].sort((x, y) => y - x);
  return (values[0] + .05) / (values[1] + .05);
}
export function safeAccent(value: unknown, mode: 'light' | 'dark' = 'light') {
  let hex = typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : '#5048e5';
  const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const encode = () => '#' + rgb.map(n => n.toString(16).padStart(2, '0')).join('');
  // Accent links must pass on both the page and its section surfaces.
  for (let attempt = 0; attempt < 40 && contrastRatio(hex, mode === 'dark' ? '#1b1e24' : '#f4f4f6') < 4.5; attempt++) {
    for (let i = 0; i < 3; i++) rgb[i] = mode === 'dark' ? Math.min(255, Math.ceil(rgb[i] + (255 - rgb[i]) * .1)) : Math.floor(rgb[i] * .9);
    hex = encode();
  }
  return hex;
}
export function themeFor(plan: GeneratedSitePlan): SiteTheme {
  const theme = plan.theme;
  const mode = theme?.mode === 'dark' ? 'dark' : 'light';
  return { layout: ['split', 'editorial', 'centered', 'immersive', 'bento'].includes(theme?.layout ?? '') ? theme!.layout : 'split', accent: safeAccent(theme?.accent ?? plan.visualDirection?.palette?.find(c => /^#[0-9a-f]{6}$/i.test(c)), mode), font: theme?.font === 'editorial' ? 'editorial' : 'modern', corners: theme?.corners === 'square' ? 'square' : 'soft', mode, density: theme?.density === 'compact' ? 'compact' : 'airy', motion: motionFor(theme?.motion) };
}
export function paletteFor(theme: SiteTheme) {
  const dark = theme.mode === 'dark';
  const accent = safeAccent(theme.accent, dark ? 'dark' : 'light');
  return {
    background: dark ? '#101216' : '#ffffff', surface: dark ? '#1b1e24' : '#f4f4f6',
    text: dark ? '#f7f7f4' : '#202027', muted: dark ? '#bbc0c9' : '#55555e',
    border: dark ? '#414650' : '#d4d4dc', accent,
    onAccent: contrastRatio(accent, '#ffffff') >= 4.5 ? '#ffffff' : '#101216',
  };
}
export function focalPointFor(image: SiteImage) {
  const clamp = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 50;
  return { x: clamp(image.focalPoint?.x), y: clamp(image.focalPoint?.y), mobileX: clamp(image.focalPoint?.mobileX ?? image.focalPoint?.x), mobileY: clamp(image.focalPoint?.mobileY ?? image.focalPoint?.y) };
}
export function launchChecks(plan: GeneratedSitePlan) {
  const colors = paletteFor(themeFor(plan));
  const validImageIds = new Set((plan.images ?? []).filter(i => ['logo', 'hero', 'gallery'].includes(i.role)).map(i => i.id));
  return [
    { label: 'שם העסק ותוכן ראשי', ok: Boolean(plan.business?.name && plan.siteTitle && plan.sections.length) },
    { label: 'פרטי קשר ישירים (בנוסף לטופס)', ok: Boolean(safePhone(plan.business?.phone) || safeEmail(plan.business?.email) || /^\d{8,15}$/.test(plan.business?.whatsapp ?? '')) },
    { label: 'תיאור לתוצאות חיפוש', ok: Boolean(plan.seo?.description) },
    { label: 'תיאורים חלופיים לתמונות', ok: (plan.images ?? []).every(image => Boolean(image.alt.trim())) },
    { label: 'התמונות שנבחרו קיימות בגרסה', ok: (!plan.heroImageId || validImageIds.has(plan.heroImageId)) && plan.sections.every(section => !section.imageId || validImageIds.has(section.imageId)) },
    { label: 'ניגודיות פלטת הטקסט והכפתורים (חישוב בסיסי)', ok: contrastRatio(colors.background, colors.text) >= 4.5 && contrastRatio(colors.surface, colors.muted) >= 4.5 && contrastRatio(colors.accent, colors.onAccent) >= 4.5 },
  ];
}
