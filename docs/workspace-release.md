# Slate workspace release — September 20, 2026

This release extends the existing Next.js/Vercel + Supabase application. It does
not redeploy the separate static Orange demo or migrate hosting providers.

## Implemented

- Shared real-site renderer for owner preview and public pages: split, editorial,
  and centered compositions; validated accent colors; actual business photos.
- Explicit image selection and per-request Gemini consent. Up to six JPG/PNG/WebP
  images, 8 MB each / 12 MB total. Inspiration-only images are model context, never
  published. Dribbble links are attribution, not fetched or treated as licenses.
- Server-written immutable media copies in a private `site-version-assets` bucket.
  Private images require ownership; public images must belong to a currently live
  version. Original uploads are not made public.
- Persistent generation status using Next `after`, a 150-second generation lease,
  and an atomic completion fence. Leaving the page does not cancel a normally
  running server invocation. A platform crash/timeout is reported; there is no
  automatic resubmission that could silently spend additional AI usage.
- Beta generation ceiling: eight AI operations per account and 150 across the
  app in a rolling 24 hours, including failed operations. Usage records survive
  project deletion. These are request-count limits, not a currency guarantee.
- Targeted manual/AI text revisions, supported layout/accent choices, and image
  selection from the current snapshot. Proposals are saved privately and shown
  before acceptance. Accepting or restoring appends a draft; it never edits history.
- Atomic exact-version publication and unpublication. Live business details come
  from the saved version, not the mutable brief. Existing version snapshots are
  backfilled using current business data; older business data cannot be recovered.
- Atomic brief/reference saving, including standalone design notes and structured
  public phone/email. Upload retries within the same form retain progress and IDs.
- Paginated lead inbox, new/contacted/completed status, transactional email outbox,
  bounded retries, and honest provider-acceptance status. Notifications go to the
  owner's verified Auth email, never to a visitor-supplied recipient.
- Strict same-origin login redirect validation and bounded JSON input parsing.
- Owner-controlled permanent project deletion with exact-name confirmation. A
  published project's dynamic public URL disappears with the database record;
  a durable, owner-scoped cleanup record is created in the same transaction and
  both private Storage prefixes are removed in bounded, idempotent batches. If a
  Storage request fails or more batches remain, the owner is told that cleanup is
  pending and can retry the same action without restoring the public site. There is no
  customer-specific Vercel deployment to delete because all sites run inside the
  shared Slate Sites application. Deletion is refused while AI generation is active.

## Required rollout order

1. Validate the build and offline checks locally.
2. Arrange a brief pause in generation, brief saves, and publication. Public site
   reading can continue. The new single-live-version constraint is incompatible
   with old publication writers, so do not leave old writers running after this
   migration while waiting indefinitely to deploy.
3. In the project's Supabase SQL Editor, run
   `supabase/migrations/202609110001_site_workspace.sql` once. The transaction is
   additive: it retains historical versions and leads, freezes version content,
   and demotes older duplicate public versions without deleting them. The latest
   previously public version stays public. Initial schema must already exist.
4. In the same SQL Editor, run
   `supabase/migrations/202609200001_project_deletion.sql` once. This replaces the
   broad project RLS policy with read/create/update policies and reserves permanent
   deletion for the server-owned, generation-fenced flow. It also creates the
   server-only `project_deletion_cleanup` outbox used for safe manual retries.
   Existing projects remain. The application fails closed with HTTP 503 if this
   migration has not been applied; it never falls back to an unfenced direct delete.
5. Run `node scripts/check-release-readiness.mjs`; then deploy this exact release
   through the existing GitHub/Vercel workflow. Do not deploy the static `dist/`.
6. Verify owner sign-in, generation, photo selection, revision review/undo, draft
   isolation, publish/unpublish, and deletion of one disposable test project. Use a
   separate owner account to check access isolation. Browser/device/accessibility
   checks have not yet been certified.

## Email notification setup

The lead inbox works without email configuration. Outbox entries are retained,
but notification delivery is not active until all of these are configured:

- `RESEND_API_KEY` — server-only Resend key.
- `LEAD_EMAIL_FROM` — a sender verified with Resend. Do not assume an arbitrary
  Gmail address or an unverified domain can send to all customers.
- `SLATE_SITES_APP_URL=https://slate-sites.vercel.app` — production origin for the
  dashboard link in notifications. This is not the localhost development origin.
- `CRON_SECRET` — a strong server-only secret for the retry worker.

Configure a scheduler available on the hosting plan to call
`GET /api/cron/lead-notifications` every five minutes with
`Authorization: Bearer <CRON_SECRET>`. The endpoint does not schedule itself.
No scheduler or paid-plan upgrade has been activated by this change. New leads
trigger an initial attempt, and owners can manually process due retries; reliable
independent automatic retries require the scheduler.

Retries stop after five attempts or a 23-hour window, within Resend's documented
24-hour idempotency window. Expired jobs remain failed rather than risking an
uncontrolled duplicate notification. The lead is always retained in the inbox.
Provider acceptance is not proof of delivery to the recipient's inbox.

## Checks

- `npm run typecheck`
- `npm run build`
- `node scripts/check-workspace.mjs` — offline regressions, no external writes.
- `node scripts/check-release-readiness.mjs` — read-only Supabase setup check.
- `node scripts/check-ai-generation.mjs --live` — opt-in single Gemini call using
  only fictional business details and a tiny synthetic image; no site persistence.

Still outside this release: voice briefs, a full guided/autosaving onboarding
conversation, custom domains, QR/social launch kits, analytics, unattended automatic
retry of pending post-deletion Storage cleanup, legal review, complete accessibility
auditing, and end-to-end production acceptance. Manual, owner-authorized cleanup
retry is implemented. Orange remains a clearly labeled hand-crafted demo. Do not
describe these remaining items as implemented or certified.
