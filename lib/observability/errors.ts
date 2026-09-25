import 'server-only';
import { randomUUID } from 'node:crypto';

type Context = { operation: 'generate' | 'analyze' | 'revise'; projectId: string; jobId?: string | null; phase?: string };

// Never serialize the exception: SDK messages/stacks can contain keys, URLs or input.
export function errorCategory(error: unknown) {
  const value = error && typeof error === 'object' ? error as { message?: unknown; status?: unknown; code?: unknown; cause?: { code?: unknown } } : {};
  const message = typeof value.message === 'string' ? value.message : '';
  const status = typeof value.status === 'number' && value.status >= 400 && value.status <= 599 ? value.status : undefined;
  const stockCodes: Record<string, string> = { configuration: 'provider_configuration', rate_limit: 'provider_quota', network: 'network', timeout: 'timeout', invalid_response: 'invalid_provider_output' };
  const stockCode = typeof value.code === 'string' && Object.hasOwn(stockCodes, value.code) ? stockCodes[value.code] : undefined;
  const category = stockCode || (status === 429 || /RESOURCE_EXHAUSTED|quota|rate limit/i.test(message) ? 'provider_quota'
    : status === 401 || status === 403 || /API_KEY_INVALID|GEMINI_API_KEY|permission denied/i.test(message) ? 'provider_configuration'
    : /timeout|timed out|abort|GENERATION_EXPIRED/i.test(message) ? 'timeout'
    : /fetch failed|ENOTFOUND|ECONNRESET|ECONNREFUSED/i.test(message + ' ' + String(value.cause?.code ?? '')) ? 'network'
    : /incomplete|no text|JSON|Unexpected token/i.test(message) ? 'invalid_model_output'
    : /schema cache|does not exist|Could not find the function/i.test(message) ? 'database_schema'
    : /VERSION_CONFLICT|GENERATION_BUSY|DAILY_LIMIT|DELETED_PROJECT/i.test(message) ? 'workflow_conflict'
    : status === 404 ? 'provider_not_found'
    : status && status >= 500 ? 'provider_unavailable' : 'unclassified');
  return { category, providerStatus: status };
}

export function logOperationError(error: unknown, context: Context): string {
  const reference = randomUUID();
  const uuid = /^[0-9a-f-]{36}$/i;
  // Explicit field selection prevents future callers from accidentally logging payloads.
  const event = {
    event: 'slate.operation_failed', reference, timestamp: new Date().toISOString(),
    operation: context.operation,
    projectId: uuid.test(context.projectId) ? context.projectId : undefined,
    jobId: context.jobId && uuid.test(context.jobId) ? context.jobId : undefined,
    phase: ['preparing', 'designing', 'sourcing', 'saving'].includes(context.phase ?? '') ? context.phase : undefined,
    ...errorCategory(error),
  };
  try { console.error(JSON.stringify(event)); } catch { /* Logging must not replace the original failure. */ }
  return reference;
}

export function withErrorReference(message: string, reference: string) {
  return `${message} (קוד תקלה: ${reference})`;
}
