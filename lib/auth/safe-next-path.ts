export function safeNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020]/.test(value)) return '/dashboard';
  try {
    if (/[\\\u0000-\u001f]/.test(decodeURIComponent(value))) return '/dashboard';
    const url = new URL(value, 'https://slate.invalid');
    return url.origin === 'https://slate.invalid' ? url.pathname + url.search + url.hash : '/dashboard';
  } catch { return '/dashboard'; }
}
