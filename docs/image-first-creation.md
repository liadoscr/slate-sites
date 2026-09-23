# Image-first creation

The creation flow separates a private visual reference from usable business photos. Existing manually curated demos are unchanged. No booking, payment, or unrestricted HTML/code generation is introduced.

## Data and privacy

- Business facts continue to use `slate_save_brief` and the existing project/brief tables.
- Versioned creation settings are owner-readable `project_activity` events with type `creation_settings_saved`. This uses the already-installed schema; no new creation migration is needed.
- Settings persist chosen images, reference focus, starting style, brand accent, owner notes, contact preference, image focal points, the server-generated reference analysis and design/text locks.
- New reference assets use `project-assets/<project>/reference/<asset>`. The generation pipeline refuses to publish such an asset as a business image, even if a request changes its role.
- Business photos use `project-assets/<project>/business/<asset>`. Only selected non-reference images are copied into immutable `site-version-assets` snapshots.
- Private previews use short-lived signed asset URLs; public media still goes through the existing version-scoped media route.
- New multipart uploads are limited to 4MB per image to remain below the hosting request-body ceiling. Existing JPEG/PNG/WebP images up to 8MB remain selectable. Up to six selected images and 12MB combined are allowed.
- Analysis, creation and targeted AI edits require explicit consent and share the existing generation quota/lease. No remote design URLs are fetched.

## Design and editing

The setup now uses three screens: business facts, design direction, and publishable photos/contact details. Fine controls remain optional; crop and alt-text adjustments live in the preview editor. Reference analysis runs on Continue only after explicit consent. Business-photo permission is separate from reference-use permission. A project with only a logo/reference must explicitly choose a photo-free draft before creation. The first newly uploaded business photo is assigned to the hero automatically, and logos have their own upload control.

Generation navigates to an owner-protected `/dashboard/projects/<id>/creating?job=<id>` progress page. It polls the exact actor/project/job, survives reload, and opens the saved version's private preview on completion. Failed requests do not redirect to an unrelated or older version. The preview exposes text, appearance and publication actions; locks and detailed controls stay in the project editor. No database migration is needed for these UX changes.

Reference analysis produces an interpretation of palette, layout, spacing and typography. The owner chooses whether to borrow structure, colors or both. Generation supports five constrained layout families, light/dark modes and section-level presentation. This is not pixel-perfect screenshot-to-code reproduction; reference business copy and images are not reused.

Edits create a private proposal first. Text edits preserve presentation; section-design edits preserve copy and asset identity. The owner can compare/apply proposals, restore saved versions, adjust desktop/mobile image focus and lock text/design. Locks are checked server-side, including again after AI work, but are not a substitute for database transaction-level multi-editor collaboration.

Quality checks cover content/contact fields, alternative text, referenced image IDs and computed palette contrast. They do not certify accessibility, measure visual similarity or guarantee business facts. Owners must review mobile layout and the published contact flow.

## Validation

Run `npm run typecheck`, `npm run build`, `node scripts/check-workspace.mjs`, `node scripts/check-creation.mjs`, `node scripts/check-creation-journey.mjs`, `node scripts/check-demos.mjs`, and `node scripts/check-demo-carousel.mjs`. For a synthetic, static layout preview only, run `node scripts/check-creation-journey.mjs --serve` and visit localhost:4181 with `?step=0`, `1`, or `2`. This harness does not authenticate, upload or write to the database.

Offline tests use mocked database/AI responses. A signed-in live test should create a disposable project, upload a reference and business photo, analyze, reload to confirm saved choices, generate, compare desktop/mobile, make and undo a section edit, and verify publish/unpublish. Do not use personal customer data for test fixtures. Project deletion has its own separately required migration and rollout notes in `workspace-release.md`.
