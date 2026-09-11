# Social renderer

Instagram posts rendered from the site's own design tokens. One HTML template
per format, styled by `src/styles/tokens.css`, screenshotted headlessly at
1080×1350. A product's photograph, price, family and specifications come
straight from Supabase, so a post needs nothing but a slug.

```bash
npm run social -- --product verona-high-back-3and2-seater
npm run social -- --product verona-high-back-3and2-seater --format spec
npm run social -- --product lily-high-back-u-shape --format carousel-cover --headline "Five ways to|fill a corner" --count 6
npm run social -- --format quote --quote "A sofa is heavy. Nothing about it should *bounce*." --attribution "The workshop"
npm run social -- --product roma-recliner-corner --format split --before Grey --after Teal
npm run social -- --list
npm run social -- --help
```

PNGs land in `out/social/` (git-ignored). `--out` puts one somewhere else,
`--html` writes the rendered page next to it for inspection in a browser.

## Formats

| format           | ground            | what it is                                                                 |
| ---------------- | ----------------- | -------------------------------------------------------------------------- |
| `full-bleed`     | the photograph    | photo fills the canvas; lockup top-left; eyebrow, headline, price, CTA at the foot |
| `quote`          | ink (default)     | no photograph; the quote in Fraunces, ember rule, attribution, lockup      |
| `spec`           | calico-100        | photo in a well, product name, specifications in Geist Mono, price + delivery promise |
| `carousel-cover` | calico-100        | display headline over a photo well, `1 / N` counter, swipe cue             |
| `split`          | ink foot          | two photos stacked with an ember rule between; label pills; optional line  |

`--ground ink` puts `quote`, `spec` and `carousel-cover` on ink-900 for grid
rhythm (every third or fourth post). `full-bleed` and `split` are always on
their photographs.

## Copy

Every line has a default drawn from the product and can be overridden:

- `--headline` defaults to the family name (`Verona Sofa`); `--eyebrow` to what
  distinguishes the product within it (`High Back · 3+2 Seater`).
- `*word*` inside a headline, quote or body becomes an ember accent
  (ember-700 on light, ember-300 on ink; italic in a quote).
- `|` is a forced line break — `"Built to be|*sat on*"`.
- Headlines step down in size with length rather than clipping, so a long one
  still fits; the top step is the brand size (120px display, 96px headline).
- `--cta ""` hides the button on `full-bleed`.

## Images

- The lead photograph is the lowest-priority variant with an image, the same
  choice the product gallery makes. `--variant Grey` picks a colour; `--image
  <url>` uses anything, which is where an AI-generated room scene goes — the
  renderer still draws every letter on top of it.
- Photos are requested from Cloudinary at the exact crop each template needs
  (`c_fill,g_auto`), never resized here.
- `split` takes `--before` and `--after` as either a URL or a variant colour.
  A colour also labels its pane; otherwise pass `--before-label` /
  `--after-label`.

## How it stays on-brand

`render.ts` inlines `src/styles/tokens.css` into every page (its `@theme`
block becomes `:root`, which is what Tailwind emits on the site), then
`social.css`, which adds only what a 1080px canvas needs: the Instagram type
sizes (floor 28px, not 12px), the two grounds, and the lockup / eyebrow / rule
primitives. Fraunces and Geist load from Google Fonts — the same files
`next/font/google` serves — and the run refuses to screenshot until every face
has loaded. Change a token on the site and the next post follows.

## Prompt discipline for generated backgrounds

When a room scene comes from an image model, append to the prompt:

> warm unbleached linen walls, muted greige, no cool blue-grey tones, soft
> north-facing daylight, no colour cast

so the generated room does not fight calico. Use the product's own Cloudinary
photograph as the reference image so the sofa stays the actual sofa.

## Requirements

Playwright is a dev dependency. The bundled Chromium is preferred
(`npx playwright install chromium`); when it is not installed the renderer
falls back to Google Chrome, then Microsoft Edge. Fonts need
`fonts.googleapis.com`; images need `res.cloudinary.com`.
