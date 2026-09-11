# Slate Sites: product review and next release

Update September 11: the implementation described in [the workspace release guide](workspace-release.md) now addresses several gaps below. Its database migration and email/scheduler setup are still required before rollout. The following review is the historical baseline, not a claim that every listed gap remains unchanged.

Reviewed against the local application on September 10, 2026. This is a source-based product review, not an accessibility certification, penetration test, or authenticated end-to-end acceptance test.

## The product promise

A Hebrew-speaking business owner describes their business, supplies visual inspiration and materials, receives an original one-page website, requests changes, and publishes it independently. There is no internal Slate approval queue. Google and email-link sign-in remain available; Apple and payments remain out of scope for now.

The strongest next investment is the generated website itself. Today the AI produces a structured text plan; the renderer puts it into a largely fixed page. More dashboard features will not close that gap.

## UI improvements in this pass

- Keep the Slate wordmark and violet/black/white identity, with neutral borders, softer shadows, clearer spacing, and larger Hebrew body text.
- Unify login, dashboard, project detail, and brief forms without restyling customer-site previews or the separate ORANGE.GEL homepage/demo.
- Put preview, generation, and publication before the long brief; make the brief collapsible and leads a separate section.
- Show the three meaningful stages: saved brief, generated content, publication. Distinguish a newer draft from an older live version.
- Keep unpublish available while a newer private draft exists; use public versions for the dashboard's live-site status.
- Group the brief into business, design direction, and content. Use one save-and-continue action instead of a non-existent team-review workflow. Validate the inspiration URL before creating project rows.
- Preserve the existing save-and-return-to-project behavior, add visible keyboard focus, and allow long lead email addresses to wrap on mobile.
- Give authentication and dashboard routes Slate titles and no-index metadata.

These changes improve presentation and navigation. They do not implement the roadmap below or make the product launch-ready by themselves.

## Finish these before inviting paying customers

| Priority | Gap found in the application | Recommended outcome |
| --- | --- | --- |
| 1 | Generation receives brief text, not the uploaded images or visual contents of a Dribbble reference. Layout and typography are mostly descriptive strings. | A validated site document with section types, layout variants, design tokens, selected image IDs, alt text, and real link targets. Render that document through controlled components. |
| 1 | The public renderer displays design-direction prose and palette swatches as customer-facing content. | Publish only business content. Design instructions affect presentation; they must not appear as sections on the customer's website. |
| 1 | Editing business name/type/location can affect the public site before republishing; publish selects the newest version at request time. | Publish the exact reviewed version, including an immutable snapshot of business details, assets, theme, and SEO. A draft must never change the live site. |
| 1 | Owners can regenerate the whole plan but cannot restore an earlier version or change one section safely. | Prompt-based revisions such as “shorten this headline” or “make the colors darker”; preserve untouched sections, save history, and allow rollback. This does not require a drag-and-drop design editor. |
| 1 | Uploaded files are listed by filename, without a complete view/replace/delete workflow; business contact channels are not collected as structured fields. | A small asset manager with thumbnails, logo/hero/gallery roles, rights confirmation, and alt text; verified phone, WhatsApp, email, maps, and social destinations. |
| 1 | Design notes are saved only when a reference URL is supplied. Project, brief, reference, and upload saves are separate operations. | Persist standalone design notes. Use atomic saves where possible and resumable/idempotent uploads, so retrying does not duplicate projects or lose completed work. |
| 1 | The login redirect guard accepts backslash-containing paths that URL parsing can interpret as another origin. | One shared same-origin redirect validator, with regression cases for protocol-relative URLs, backslashes, control characters, and normal dashboard paths. |
| 1 | Generation throttles using the last successful version, and contact limiting is process-local. | Durable per-user/project limits, a generation lock, idempotency, timeout/retry handling, bot controls, and an overall spending ceiling. Reject unauthorized requests before paid work. |
| 2 | Leads appear as only the latest 20 activity records; there is no complete inbox or delivery confirmation. | Paginated inbox, new/contacted/done status, export/delete controls, email notifications with retry, spam filtering, and honest success/failure messages. |
| 2 | Plan SEO is not fully wired into the public site's metadata; site URLs are UUID-based. | Per-business title/description, canonical URL, social preview, readable slug, and indexing rules. Private previews stay out of search engines. |
| 2 | Account management and operational safeguards are incomplete. | Sign-out/profile controls, deletion/export workflows, published retention rules, backup-and-restore drills, error monitoring, and a support path. Review provider data handling before sending customer materials to AI. |

Evidence areas: `lib/ai/gemini.ts`; `app/api/projects/[projectId]/generate/route.ts`; `app/api/projects/[projectId]/publish/route.ts`; `app/sites/[projectId]/page.tsx`; `components/projects/new-project-brief-form.tsx`; `components/projects/edit-project-brief-form.tsx`; `app/auth/page.tsx`; `app/auth/callback/route.ts`; `supabase/migrations/`.

## What visual-reference generation should mean

1. The owner provides a Dribbble link for attribution/inspiration, an optional reference screenshot they have permission to use, and an explanation of what they like.
2. Explain exactly what gets sent to the model. Obtain the appropriate permission before sending assets; never fetch arbitrary user URLs without SSRF protections, redirect checks, type/size limits, and an allowlist where appropriate.
3. Extract broad design attributes: section rhythm, contrast, image placement, density, and typography category. Create an original design; do not imply that Dribbble shots are licensed templates or copy protected assets.
4. Generate a typed, validated document rather than executing arbitrary AI-produced code. Keep private originals separate from the assets intentionally published for that site.
5. Show the actual desktop and mobile result. Let the owner request bounded changes before publishing the reviewed snapshot.

## Useful additions after the core is reliable

- **Business-specific starters:** services, local studio, consultant, tradesperson, restaurant. Tailor fields and sections without a giant onboarding questionnaire.
- **A pre-publication checklist:** missing logo/contact details, broken links, placeholder copy, image alt text, contrast, and mobile layout. Show what was actually checked; never display a blanket “100% accessible” or “maximum security” badge.
- **Custom domains:** automated verification and clear DNS guidance, certificate status, and renewal responsibility. Start with readable platform URLs.
- **Simple conversion analytics:** visits, contact submissions, and WhatsApp/phone clicks, with a privacy-conscious implementation.
- **Recoverable drafts:** autosave, explicit “saved” feedback, unsaved-change protection, and duplicate a previous project.
- **Private review links:** optional, revocable, expiring links for a colleague to review a draft, without mandatory approval by Slate.
- **Account export/ownership handoff:** consider a static export or transfer path once the generated site format is stable.

Defer a marketplace, complex animations, team permissions, a full visual editor, online stores, and multiple-page websites. Those introduce substantial scope without fixing the current one-page experience. Billing remains deferred; before reinstating a one-time price, define ongoing hosting/AI/storage limits and who pays for growth.

## Suggested next implementation slice

**Image-aware generation + safe preview + exact-version publication.**

Acceptance criteria:

- Two materially different visual briefs produce intentionally different layouts, not merely different text.
- The owner's selected logo and images appear, with accessible alternatives; missing images produce an honest empty state, not invented client assets.
- WhatsApp, phone, maps, and email actions use validated business details.
- Updating a draft leaves every part of the current live site unchanged.
- Publishing selects exactly the version the owner reviewed; prior versions remain recoverable.
- A failed or repeated generation request has a clear outcome and does not create uncontrolled duplicate work.
- Keyboard, screen-reader, Hebrew RTL, narrow-screen, and 200% zoom checks pass for the key flows; the actual scope and any remaining issues are recorded.
- Another account cannot access a customer's draft, uploads, leads, or publication controls.

## Homepage/demo decision — resolved September 11

The owner requested Slate Sites back at `/` and ORANGE.GEL as a separate project in their existing account. The restored homepage now uses Slate branding, self-service copy, responsive navigation, and a clearly labeled curated-demo showcase. The original orange component is selected by the imported project's saved version; its public route honors visibility and its private preview retains owner authorization. The demo is not presented as an automatic output of the current AI engine. See README for the repeat-safe import and preservation details.
