import 'server-only';

export type StockPhoto = {
  bytes: Buffer;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  attribution: {
    provider: 'pexels';
    photoId: string;
    photographer: string;
    photographerUrl: string;
    sourceUrl: string;
  };
  alt: string;
};

type StockErrorCode = 'configuration' | 'rate_limit' | 'network' | 'timeout' | 'invalid_response';
const messages: Record<StockErrorCode, string> = {
  configuration: 'מאגר התמונות עדיין לא מחובר. אפשר להמשיך בלי תמונות או להעלות תמונות משלכם.',
  rate_limit: 'מאגר התמונות הגיע כרגע למגבלת שימוש. אפשר להמשיך בלי תמונות ולנסות מאוחר יותר.',
  network: 'לא הצלחנו להתחבר למאגר התמונות. אפשר להמשיך בלי תמונות או להעלות תמונות משלכם.',
  timeout: 'חיפוש התמונות התעכב. אפשר להמשיך בלי תמונות ולנסות שוב מאוחר יותר.',
  invalid_response: 'לא התקבלה תשובה תקינה ממאגר התמונות. אפשר להמשיך בלי תמונות.',
};

// Only these safe fields may leave the provider boundary; never retain raw causes/bodies.
export class StockPhotoError extends Error {
  constructor(public readonly code: StockErrorCode, public readonly status?: number) {
    super(messages[code]);
    this.name = 'StockPhotoError';
  }
}

type Dependencies = { fetch?: typeof fetch; apiKey?: string; timeoutMs?: number };
type Candidate = Omit<StockPhoto, 'bytes' | 'mimeType'> & { imageUrl: string };
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_TOTAL_BYTES = 8 * 1024 * 1024;
const MAX_JSON_BYTES = 256 * 1024;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function cleanText(value: unknown, maximum: number) {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maximum) : '';
}

function safeUrl(value: unknown, kind: 'image' | 'photo' | 'photographer'): string | null {
  if (typeof value !== 'string' || value.length > 2_048 || /[\s\\]/.test(value)) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.port || url.username || url.password || url.hash) return null;
    if (kind === 'image') {
      if (url.hostname !== 'images.pexels.com' || !/^\/photos\/\d+\/[^/]+\.(?:jpe?g|png|webp)$/i.test(url.pathname)) return null;
    } else {
      if (!['pexels.com', 'www.pexels.com'].includes(url.hostname) || url.search) return null;
      const path = kind === 'photo' ? /^\/photo\/[a-z0-9-]+\/?$/i : /^\/@[a-z0-9._-]+\/?$/i;
      if (!path.test(url.pathname)) return null;
    }
    return url.href;
  } catch { return null; }
}

function candidateFor(value: unknown): Candidate | null {
  const photo = record(value);
  if (!photo || !Number.isSafeInteger(photo.id) || Number(photo.id) <= 0) return null;
  const source = record(photo.src);
  const imageUrl = safeUrl(source?.large2x, 'image') ?? safeUrl(source?.large, 'image') ?? safeUrl(source?.landscape, 'image');
  const sourceUrl = safeUrl(photo.url, 'photo');
  const photographerUrl = safeUrl(photo.photographer_url, 'photographer');
  const photographer = cleanText(photo.photographer, 120);
  if (!imageUrl || !sourceUrl || !photographerUrl || !photographer) return null;
  return {
    imageUrl,
    alt: cleanText(photo.alt, 300) || 'תמונת המחשה ממאגר Pexels',
    attribution: { provider: 'pexels', photoId: String(photo.id), photographer, photographerUrl, sourceUrl },
  };
}

async function readBounded(response: Response, maximum: number, onBytes?: (length: number) => void): Promise<Buffer | null> {
  const declared = response.headers.get('content-length');
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > maximum)) {
    void response.body?.cancel().catch(() => {});
    return null;
  }
  const reader = response.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      onBytes?.(value.byteLength);
      if (size > maximum) {
        void reader.cancel().catch(() => {});
        return null;
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks, size);
  } finally { reader.releaseLock(); }
}

function imageType(bytes: Buffer): StockPhoto['mimeType'] | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

function throwStatus(status: number): never {
  throw new StockPhotoError(status === 401 || status === 403 ? 'configuration' : status === 429 ? 'rate_limit' : 'network', status);
}

/** Search terms only, never private contact details. Results/credits must not be sent to an AI model. */
export async function findStockPhotos(queries: string[], limit = 3, dependencies: Dependencies = {}): Promise<StockPhoto[]> {
  const count = Number.isFinite(limit) ? Math.max(0, Math.min(3, Math.floor(limit))) : 3;
  const terms = [...new Set((Array.isArray(queries) ? queries.slice(0, 12) : []).map(query => cleanText(query, 120)).filter(Boolean))].slice(0, 3);
  if (!count || !terms.length) return [];
  const key = (dependencies.apiKey ?? process.env.PEXELS_API_KEY)?.trim();
  if (!key || /[\r\n]/.test(key)) throw new StockPhotoError('configuration');
  const request = dependencies.fetch ?? fetch;
  const controller = new AbortController();
  const timeoutMs = Number.isFinite(dependencies.timeoutMs) ? Math.max(1, Math.min(20_000, dependencies.timeoutMs!)) : 20_000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const candidates: Candidate[] = [];
  const seen = new Set<string>();
  let transferredBytes = 0;
  try {
    // Search at most three times, then select across queries so one broad search cannot dominate.
    const groups: Candidate[][] = [];
    for (const term of terms) {
      const url = new URL('https://api.pexels.com/v1/search');
      url.search = new URLSearchParams({ query: term, per_page: '5', orientation: 'landscape' }).toString();
      const response = await request(url, { headers: { Authorization: key, Accept: 'application/json' }, signal: controller.signal, redirect: 'error', cache: 'no-store' });
      if (!response.ok) { void response.body?.cancel().catch(() => {}); throwStatus(response.status); }
      const bytes = await readBounded(response, MAX_JSON_BYTES);
      if (!bytes) throw new StockPhotoError('invalid_response');
      let result: Record<string, unknown> | null;
      try { result = record(JSON.parse(bytes.toString('utf8'))); } catch { throw new StockPhotoError('invalid_response'); }
      if (!Array.isArray(result?.photos)) throw new StockPhotoError('invalid_response');
      groups.push(result.photos.slice(0, 5).map(candidateFor).filter((photo): photo is Candidate => Boolean(photo)));
    }
    for (let index = 0; index < 3 && candidates.length < count; index++) {
      for (const group of groups) {
        const candidate = group.find(photo => !seen.has(photo.attribution.photoId));
        if (!candidate) continue;
        seen.add(candidate.attribution.photoId);
        candidates.push(candidate);
        if (candidates.length >= count) break;
      }
    }
    const photos: StockPhoto[] = [];
    // No retries or substitution downloads: at most three image requests and an 8 MB read budget.
    for (const candidate of candidates) {
      if (transferredBytes >= MAX_TOTAL_BYTES) break;
      const response = await request(candidate.imageUrl, { headers: { Accept: 'image/jpeg,image/png,image/webp' }, signal: controller.signal, redirect: 'error', cache: 'no-store' });
      if (!response.ok) { void response.body?.cancel().catch(() => {}); throwStatus(response.status); }
      const maximum = Math.min(MAX_IMAGE_BYTES, MAX_TOTAL_BYTES - transferredBytes);
      const bytes = await readBounded(response, maximum, size => { transferredBytes += size; });
      if (!bytes) continue;
      const mimeType = imageType(bytes);
      const declaredType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
      if (!mimeType || (declaredType && declaredType !== mimeType)) continue;
      photos.push({ bytes, mimeType, attribution: candidate.attribution, alt: candidate.alt });
    }
    return photos;
  } catch (error) {
    if (controller.signal.aborted) throw new StockPhotoError('timeout');
    if (error instanceof StockPhotoError) throw error;
    throw new StockPhotoError('network');
  } finally { clearTimeout(timeout); }
}
