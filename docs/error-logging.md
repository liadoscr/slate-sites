# AI workflow error logs

Generation, reference analysis and revision catches emit one JSON `slate.operation_failed` event through the server logger. In production these go to Vercel runtime logs; locally they appear in the development terminal. No additional key or database migration is needed.

Search Vercel project Logs for the `reference` shown as `קוד תקלה` in the error message. Failed job records retain that reference in `site_generation_jobs.error_message`, using the existing access controls. Events include UTC timestamp, operation, project/job IDs, generation phase, category and numeric provider status when available. These identifiers are operational metadata and should only be accessible to trusted project administrators.

Never log raw exceptions, stacks, provider bodies, prompts, images, email addresses, keys, tokens or headers. Classification reads an error in memory but emits only fixed category names. Unknown errors deliberately remain `unclassified`; add a safe classifier or targeted diagnostic rather than dumping the exception.

This is not a permanent error archive: runtime-log retention depends on the hosting plan. Export relevant events while available, or configure a restricted log drain/error-monitoring service if long-term retention is needed. Existing failures cannot be reconstructed retroactively. Hard platform termination may bypass catches; inspect platform timeout logs and the job expiry state in that case.

Test without customer data or model calls: `node scripts/check-error-logging.mjs`.
