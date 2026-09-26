/** Validate AI-authored photographic search phrases, without an industry allowlist. */
export function stockQueriesFor(value: unknown, excludedIdentity: unknown[] = []): string[] {
  if (!Array.isArray(value)) return [];
  const identities = excludedIdentity.filter((item): item is string => typeof item === 'string')
    .map(item => item.toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(item => item.length >= 3);
  const queries: string[] = [];
  for (const item of value.slice(0, 3)) {
    if (typeof item !== 'string' || item.length > 80) continue;
    const query = item.toLowerCase().trim().replace(/ +/g, ' ');
    // Fail closed on URLs, email, numbers, handles, control characters and long payloads.
    if (!/^[a-z]{2,22}(?: [a-z]{2,22}){0,5}$/.test(query)) continue;
    if (/\b(?:http|https|www|com|gmail|email|password|token|secret|address|phone)\b/.test(query)) continue;
    if (identities.some(identity => ` ${query} `.includes(` ${identity} `))) continue;
    if (!queries.includes(query)) queries.push(query);
  }
  return queries;
}
