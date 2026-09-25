export type StockAttribution = {
  provider: 'pexels'; photoId: string; photographer: string; photographerUrl: string; sourceUrl: string;
};
function pexelsUrl(value: unknown, type: 'photo' | 'profile') {
  if (typeof value !== 'string' || value.length > 500) return '';
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !['www.pexels.com', 'pexels.com'].includes(url.hostname) || url.port || url.username || url.password || url.search || url.hash) return '';
    return (type === 'photo' ? /^\/photo\/[a-z0-9-]+\/?$/i : /^\/@[a-z0-9._-]+\/?$/i).test(url.pathname) ? url.href : '';
  } catch { return ''; }
}
export function stockAttributionFor(value: unknown): StockAttribution | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const v = value as Record<string, unknown>;
  const sourceUrl = pexelsUrl(v.sourceUrl, 'photo');
  const photographerUrl = pexelsUrl(v.photographerUrl, 'profile');
  if (v.provider !== 'pexels' || typeof v.photoId !== 'string' || !/^\d{1,20}$/.test(v.photoId) || !sourceUrl || !photographerUrl || typeof v.photographer !== 'string' || !v.photographer.trim()) return undefined;
  return { provider: 'pexels', photoId: v.photoId, sourceUrl, photographerUrl, photographer: v.photographer.trim().slice(0, 120) };
}
