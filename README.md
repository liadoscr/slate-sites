# Slate Sites

Slate Sites is a Hebrew, RTL-first platform where a business owner securely logs in, submits a website brief, uploads source materials, and tracks their website project with Slate.

## What is implemented

- Next.js 16 application ready for Vercel
- Responsive Slate-inspired landing, authentication, dashboard, and new-project flow
- Email OTP sign-in for direct visitors, without passwords
- Secure Slate handoff design: Slate creates an opaque, one-time ID server-to-server; the browser never receives an email in its URL; the user must still verify that email with OTP
- Separate Slate Sites user database (`auth.users` plus `public.profiles`), projects, briefs, Dribbble references, assets, website versions, login events, and project activity
- Private, project-scoped storage bucket with row-level access rules
- Project dashboard and real client-side saving/upload flow once Supabase is configured
- Baseline browser security headers and server-only protection around service-role access

## Stack

- Next.js / TypeScript / Vercel
- Supabase Auth for email OTP and cookie sessions
- Supabase Postgres with Row Level Security
- Supabase Storage for private customer assets

## Local setup

1. Create a Supabase project.
2. Run [`supabase/migrations/202609070001_initial_schema.sql`](supabase/migrations/202609070001_initial_schema.sql) in its SQL editor.
3. Copy `.env.example` to `.env.local` and fill in the project URL, publishable key, and service-role key. Never commit `.env.local`.
4. In Supabase Auth, enable email OTP and change the email template to include `{{ .Token }}` (not only `{{ .ConfirmationURL }}`). Configure the site URL and allowed redirect URLs for local, preview, and production domains.
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

The response contains a `continue_url` with a random, single-use handoff ID valid for ten minutes. Slate redirects the browser there. Slate Sites retrieves the email server-side, pre-fills it, sends the OTP, verifies it, and records a `slate` login event. A direct email OTP login records a `direct` event instead.

## Important deployment work still required

- Create and configure the real Supabase project and email sender/domain
- Put all environment variables in Vercel—not source control
- Store `SLATE_HANDOFF_HMAC_SECRET` in both systems and implement the Slate backend call
- Add rate limits, bot protection, monitoring, backup/retention jobs, and legal/privacy pages before public launch
- Build the internal Slate review queue, preview approvals, publishing workflow, custom-domain setup, and contact-form delivery
