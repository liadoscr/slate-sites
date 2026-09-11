# Slate Sites

Slate Sites is a Hebrew, RTL-first platform where a business owner securely logs in, submits a website brief, uploads source materials, and tracks their website project with Slate.

## What is implemented

- Next.js 16 application ready for Vercel
- Responsive Slate-inspired landing, authentication, dashboard, and new-project flow
- Google and email magic-link sign-in for direct visitors, without passwords
- Secure Slate handoff design: Slate creates an opaque, one-time ID server-to-server; the browser never receives an email in its URL; the user must still verify that email with a sign-in link
- Separate Slate Sites user database (`auth.users` plus `public.profiles`), projects, briefs, Dribbble references, assets, website versions, login events, and project activity
- Private, project-scoped storage bucket with row-level access rules
- Project dashboard and real client-side saving/upload flow once Supabase is configured
- Baseline browser security headers and server-only protection around service-role access
- Image-aware Gemini generation, real-site desktop/mobile previews, targeted revisions, version restoration, exact-version publishing, and a paginated lead inbox (requires the workspace release migration)

See [the product review and prioritized roadmap](docs/slate-sites-product-review.md) for current limitations and the next implementation slice. Slate Sites is the root homepage, with working surfaces under `/auth` and `/dashboard`.

For the new release, follow [the workspace release and rollout guide](docs/workspace-release.md). It records implemented behavior, the required database migration, email/scheduler setup, validation, and remaining work. Do not deploy the new routes before coordinating that migration.

## ORANGE.GEL product demo

The preserved, hand-crafted demo belongs to the owner's real Supabase project `855f60cc-2e52-443c-83c4-dfa2c6579210`. Its brief, original hero asset, and first site version are stored alongside normal projects. The saved `orange-gel-v1` template marker selects the original component in both the owner-only preview and public site. This is a curated product example, not an automatically generated AI result; sample business details are explicitly labeled.

The public route checks the saved version's visibility. Unpublishing removes public access and the homepage's demo link; it does not delete the project. Normal AI generation can create a new private draft without replacing the original demo version. The existing static `dist/` export and `.openai/hosting.json` are retained separately; deploy the main Next.js app using its existing Vercel workflow.

`node scripts/import-orange-demo.mjs` is a read-only check. `--apply` creates missing records and uploads without overwriting existing work; `--apply --publish` explicitly publishes the imported version. Only use this one-time importer for the account named in the script. It verifies the account's email, rejects conflicting IDs/duplicate projects, and refuses to publish over newer versions. It does not print credentials and does not require a schema migration.

## Stack

- Next.js / TypeScript / Vercel
- Supabase Auth for Google/email-link sign-in and cookie sessions
- Supabase Postgres with Row Level Security
- Supabase Storage for private customer assets

## Local setup

1. Create a Supabase project.
2. Run [`supabase/migrations/202609070001_initial_schema.sql`](supabase/migrations/202609070001_initial_schema.sql) and then [`supabase/migrations/202609110001_site_workspace.sql`](supabase/migrations/202609110001_site_workspace.sql) in its SQL editor. Existing installations need only the second migration and the rollout instructions above.
3. Copy `.env.example` to `.env.local` and fill in the project URL, publishable key, and service-role key. Never commit `.env.local`.
4. In Supabase Auth, enable email sign-in and keep `{{ .ConfirmationURL }}` in the magic-link template. This UI opens an email link; it does not have a numeric-code entry step. Configure the site URL and allowed `/auth/callback` redirect URLs for local, preview, and production domains. Configure the Google provider separately for social sign-in.
5. Start the app:

   ```powershell
   npm run dev
   ```

   Open `http://localhost:3000`.

## Slate handoff contract

Slate's **backend** calls `POST /api/slate/handoffs`; the browser should not call it.

Headers:

```text
X-Slate-Timestamp: Unix milliseconds
X-Slate-Signature: sha256=<hex HMAC-SHA256(timestamp + "." + raw request body)>
```

JSON body:

```json
{
  "email": "owner@business.co.il",
  "slate_user_reference": "optional-stable-slate-id"
}
```

The response contains a `continue_url` with a random, single-use handoff ID valid for ten minutes. Slate redirects the browser there. Slate Sites retrieves the email server-side, pre-fills it, sends a sign-in link, verifies the email in the callback, and records a `slate` login event. Direct sign-in records a `direct` event instead.

## Important deployment work still required

- Create and configure the real Supabase project and email sender/domain
- Put all environment variables in Vercel—not source control
- Store `SLATE_HANDOFF_HMAC_SECRET` in both systems and implement the Slate backend call
- Add rate limits, bot protection, monitoring, backup/retention jobs, and legal/privacy pages before public launch
- Apply and verify the workspace migration, complete notification sender/scheduler setup, and test the authenticated release end to end; custom domains remain future work. Publishing is owner-controlled, with no internal review queue.
