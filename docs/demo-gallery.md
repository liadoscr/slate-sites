# Slate Sites demo gallery

Three hand-crafted informational business sites. No booking, scheduling, checkout,
payments or visitor-data collection in the demos. Service prices shown in Orange
are fictional information, not a purchase flow. Existing contact forms on actual
customer sites remain general enquiries, not booking or payment systems.

FORMA now follows the user-provided screenshot reference: a cool-gray canvas, framed rounded hero, oversized neo-grotesk type and white bento panels with restrained green and purple accents. MOVE follows the second supplied screenshot: a matte-black gym layout, high-contrast training photography, condensed display type and acid-lime controls. The reference logos, copy, pricing and artwork were not reused. The demo code and images remain original adaptations. ORANGE.GEL retains its existing design.

The renderer is selected by the saved version's allowlisted template marker.
Public routes and the homepage carousel still require a published version; the
catalog never bypasses publication or preview ownership. Generating a new AI
draft does not replace a published demo. These are curated examples, not claimed
automatic outputs of the AI generator.

The homepage shows demos only in the hero carousel (`#demo-preview`), without a
second gallery below it. The main navigation and demo return links target it.

| Demo | Project | Rendering |
| --- | --- | --- |
| ORANGE.GEL | `855f60cc-2e52-443c-83c4-dfa2c6579210` | Existing orange nail studio, informational CTAs |
| FORMA | `a4ade433-5583-4322-bcd3-fd7b3cc04fef` | Cool-gray framed hero, rounded bento cards, numbered service rows and graphic process panel |
| MOVE | `f18aaa09-836b-4a2e-9c8c-c2e5134b7902` | Matte-black gym hero, acid-lime accents, image-led services and informational training paths |

## Import and release

`node scripts/import-business-demos.mjs` checks the two new demos against the
verified `liadoscr@gmail.com` account without writing. `--apply` creates private
projects, briefs, uploaded hero originals and immutable saved versions. Stable
IDs and request IDs make retries safe. Existing owner work is never overwritten.
Deploy the renderers to the existing Vercel project before `--apply --publish`.
Publication uses the existing exact-version transaction, and already-public
versions are left alone. No migration or new credentials are required.

Checks: `node scripts/check-demos.mjs`, `node scripts/check-workspace.mjs`,
`npm run build`. Browser/device interaction QA is not included in those checks.

## Image assets and exact prompts

The original portraits below were generated with the built-in image-generation
tool, not an API fallback. They were inspected as standalone images and converted
to WebP without cropping or retouching, preserving the original 1122 × 1402
dimensions. FORMA still uses its portrait as a detail image; MOVE's old portrait
is retained as a source asset but is no longer displayed in the hero. Images
portray fictional people and are labeled illustrative, never client results or
testimonials.

The redesign uses two additional original wide photographs, generated with the
same built-in tool and inspected before integration. Neither Dribbble shot was
copied or embedded. The homepage carousel now has separate FORMA/MOVE layouts
instead of routing every preview through the orange card structure.

### FORMA editorial hero (redesign)

Saved asset: `public/demos/forma-editorial-hero-v2.webp` (76,586 bytes; optimized from the generated PNG).

```text
Use case: photorealistic-natural; Asset type: wide website hero photograph for FORMA, a Hebrew boutique hair salon; Primary request: an original cinematic editorial photograph of a thoughtfully designed boutique hair salon interior, with exactly one adult woman with beautifully natural dark wavy hair in the foreground or mid-ground; refined working salon with believable mirrors, styling stations, seating and textured architectural surfaces; warm neutral palette; premium, photorealistic architecture and lifestyle magazine photography; authentic materials and natural hair texture; wide landscape, clear architectural lines, woman integrated naturally, generous visually quiet area suitable for large page headline; soft daylight; original composition, realistic anatomy and hands; no text, lettering, signs, logos, watermarks, UI, graphic overlays; do not reproduce existing Shakuro/Dribbble image.
```

### MOVE action hero (redesign)

Saved asset: `public/demos/move-action-hero-v2.webp` (31,532 bytes; optimized from the generated PNG).

```text
Use case: photorealistic-natural; Asset type: wide photo-led website hero photograph for MOVE, a personal training brand; original editorial sports photograph of one adult personal trainer in dark training clothes captured in dynamic but natural exercise action; outdoors at urban training location or modern gym; photorealistic premium sports editorial photography, authentic motion, real skin/fabric texture and credible anatomy; wide landscape with ample visually quiet deep-shadow negative space for large white typography; directional naturalistic light, deep slate/navy shadows; lime accent only from realistic clothing styling; no text, lettering, logos, watermarks, UI, graphic overlays or fake objects; do not reproduce existing QClay/Dribbble image.
```

### FORMA

Saved asset: `public/demos/forma-hair-hero.webp` (134,956 bytes).

```text
Use case: photorealistic-natural
Asset type: portrait website hero photograph for fictional Hebrew boutique hair salon FORMA; image only.
Scene/backdrop: clean warm gray studio background.
Subject: one adult woman with beautiful shoulder-length sculpted dark wavy hair, wearing a minimal white shirt, three-quarter portrait pose, person centered, graceful natural motion in her hair.
Style/medium: photorealistic premium editorial fashion photography, quiet luxury magazine look.
Composition/framing: portrait 4:5 aspect ratio, centered subject with clear headroom and shoulders, crisp hair texture.
Lighting/mood: soft directional daylight, calm and elegant.
Color palette: natural photographic skin and hair colors, no tint. Intended surrounding website palette is pale pink #f9eaf0, deep burgundy #491729 and off-white, but do not add these colors artificially to the photograph.
Materials/textures: real skin pores, individual hair strands and soft waves, natural fabric texture.
Constraints: original fictional person; believable anatomy; no typography, logos, UI, watermark, frames or collage. This is illustrative fictional demo imagery, not an actual client or testimonial.
```

### MOVE

Saved asset: `public/demos/move-trainer-hero.webp` (64,426 bytes).

```text
Use case: photorealistic-natural
Asset type: portrait website hero photograph for fictional personal trainer brand MOVE; image only.
Scene/backdrop: minimal dark charcoal strength gym, graphite shadows, ample clean background with restrained gym equipment.
Subject: one fit adult male trainer wearing a plain black sports shirt and shorts, standing with one dumbbell held naturally at his side, composed approachable confidence, realistic achievable physique.
Style/medium: photorealistic energetic editorial sports portrait with real skin and fabric texture.
Composition/framing: portrait 4:5 aspect ratio, three-quarter body framing showing head through lower thighs, centered trainer with ample headroom and clean surrounding background; anatomically natural hand gripping the dumbbell.
Lighting/mood: directional side light, subtle lime light accent, graphite shadows, energetic but grounded.
Constraints: original fictional person; believable anatomy and realistic proportions; no logos, typography, watermark, UI, frames or collage. This is illustrative fictional demo imagery, not an actual client or testimonial.
```
