# Description-first creation and stock photography

New projects offer two paths: a description-first quick start and the existing image-led wizard. Quick start requires a 30–2500 character description; the name is optional and temporarily uses `העסק שלי`. After explicit consent it saves the brief, saves `creationMode: automatic` / `imageSource: stock`, and starts the existing owner-scoped, quota-limited generation job. Phone, email and location stay blank until the owner supplies them. The initial CTA uses the contact form.

Gemini chooses the supported layout, text, and up to three generic English photographic search phrases in one model call. There is no industry allowlist. The default starter does not override an automatic layout. The model is instructed to omit identities and private facts; server validation rejects URLs, email, numbers, handles, long payloads and exact English business-name/location matches. These checks are defense in depth, not a guarantee of perfect semantic privacy or image relevance. Raw descriptions and contact fields are not sent to Pexels. Empty or invalid search output produces a photo-free draft with a review note.

## Setup

1. Create a Pexels API key at https://www.pexels.com/api/ and review its API requirements.
2. Set server-only `PEXELS_API_KEY` in `.env.local` for development and Vercel environment variables for production. Never use `NEXT_PUBLIC_` or commit the key.
3. Restart the local server / redeploy Vercel after changing the variable.

Without the key the quick-start screen explains the missing configuration and offers the existing guided path. The backend also rejects stock generation before consuming a generation slot. No SQL migration is needed.

## Safety and ownership

- The Pexels adapter uses HTTPS allowlisted hosts, no redirects, bounded response bodies, MIME/signature checks, a 20-second total request budget, at most 3 searches/downloads, 4MB per image and an 8MB download budget. There is no automatic retry.
- Stock image bytes and photographer metadata are never sent to Gemini. They are downloaded to private `site-version-assets` snapshots after text generation, served through the existing private/public media checks, and become public only when the owner publishes that version.
- Credit metadata stays in the saved version. Each stock photo is labeled illustrative; Pexels and photographer source links appear in both preview and public rendering. Stock photos must not be represented as actual employees, completed work, or business premises.
- Stock selection/search failures are logged with phase `sourcing`. Bounded outcome events distinguish no valid search phrase, exhausted time budget, no usable photos and successful attachment; no search phrases or private data are logged. The text draft is saved with a review note; users can upload their own photos without regenerating.
- Preview editing supports name, location, phone and email. Changes are reviewed as proposals before becoming a new draft. These are version-specific edits; the original generation brief is separate.
- A photo replacement uploads an owner-scoped business asset and creates a private version proposal without calling AI. It respects both locks and cannot import private reference images. Old versions/files are not modified. Orphaned snapshot storage from failed attempts remains under the project's existing cleanup lifecycle.
- No booking, payments, automatic publication, permanent logging service or additional billing setup is introduced.

## Verification

Run `node scripts/check-stock-provider.mjs`, `node scripts/check-stock-generation.mjs`, `node scripts/check-quick-start-ui.mjs`, `node scripts/check-contact-details.mjs`, `node scripts/check-creation.mjs`, `node scripts/check-creation-journey.mjs`, `node scripts/check-revisions.mjs`, `npm run typecheck` and `npm run build`.

All automated checks use synthetic providers, AI output and database records. A real end-to-end test still requires configured Pexels/Gemini keys and an authenticated user. `node scripts/check-quick-start-ui.mjs --serve` serves a static, non-interactive layout fixture at `http://127.0.0.1:4185/`; `?configured=0` shows the missing-key state.
