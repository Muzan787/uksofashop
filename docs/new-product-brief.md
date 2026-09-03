# New product brief — made-to-order range

Fill this in, paste it back to me with the Cloudinary links, and I'll create the
products, variants, categories and the variant group in the database.

## Before you start — three things about how this site is built

**1. One database product per size/style, not one per range.**
"Verona Sofa" is not one row — it's 14. Each seat size and each back style is
its own product with its own price, dimensions, photo and URL. They're tied
together by a **variant group**, which is what draws the size buttons and the
style buttons on the product page. So Section B below gets repeated once per
piece you want to sell.

**2. You do not list fabrics.** Ticking made-to-order attaches the whole live
fabric library (69 colours across 6 collections) automatically, plus the free
swatch service and the Consumer Contracts Regulations notice. What you *do*
list is the colourway each piece was **photographed** in — that's the variant.
One photographed variant per piece is normal.

**3. Every piece needs at least one variant with a photo.** No variant means no
price, no picture and no working Add to Basket. This is the one field I can't
invent for you.

---

## Section A — the range (fill in once)

```
Range name:              e.g. Verona Sofa
Second axis name:        e.g. Style   <- what the second row of buttons is called
                                        (Style / Back / Arm / Finish). Leave
                                        blank if there is only one version of
                                        each size.
Made to order:           Yes / No
Where it's made:         UK / Imported / Not specified
                         (only "UK" prints the Made in the UK badge — needs to
                          be evidenced)
Default categories:      tick all that apply, per-piece overrides below
                         [ ] Fabric Sofas
                         [ ] Leather Sofas
                         [ ] 3+2 Seaters
                         [ ] Corner Settees
                         [ ] Recliner
                         [ ] Electric Recliners
```

**Description** (shared across every piece unless you write a different one in a
piece's block — 2 to 4 paragraphs, plain sentences, no bullet points):

```


```

**Shared specifications** — these show as the spec table on every piece. Copy the
rows you want, add your own, delete the rest. Keep the spelling of `Style`,
`Material` and `Dimensions` exactly as written; the shop filters and the "will
it fit" calculator read those three by name.

```
Style:                    e.g. High Back
Material:                 e.g. Fabric
Frame:                    e.g. Kiln-dried hardwood
Filling:                  e.g. High-density foam, fibre-wrapped
Legs:                     e.g. Dark wood, 12cm
Seat height:              e.g. 47cm
Weight capacity:
All Cushions Included:    ✓
```

---

## Section B — the pieces (repeat this block for each one)

Delete anything that doesn't apply. Title and URL are optional — leave them
blank and I'll build them the same way the Verona range is built.

```
-- PIECE 1 ------------------------------------------------
Size:                e.g. 3 Seater / 3+2 Seater / 4 Seater Corner 1c2 / Arm Chair
Style:               e.g. High Back        <- the second axis from Section A
Price (£):           e.g. 419.00           <- what this piece sells at
Dimensions:          e.g. L:198cm H:97cm D:99cm
                     corners: 190cm x 240cm H:90cm D:95cm
                     3+2:     3 Seater: L:198cm ... | 2 Seater: L:168cm ...
Categories:          leave blank to use the Section A defaults
Spec overrides:      only rows that differ from Section A
Title:               (optional — otherwise "Verona 3 Seater High Back")
URL slug:            (optional — otherwise verona-high-back-3-seater)

Photographed in:
  Colour name:       e.g. Grey
  Colour swatch hex: e.g. #7d7d7d   <- the dot shown on the product page
  Material:          e.g. Fabric    <- drives the Material filter in the shop
  SKU:               e.g. VHB3-G    <- yours, must be unique across the site
  Main photo:        https://res.cloudinary.com/dmlna04yk/image/upload/...

  (a second photographed colourway, only if you have one:)
  Colour name:
  Colour swatch hex:
  SKU:
  Main photo:
  Price difference:  e.g. +40 — leave blank if it's the same money

Extra photos, in the order they should appear:
  1. https://res.cloudinary.com/dmlna04yk/image/upload/...
  2.
  3.
-----------------------------------------------------------
```

```
-- PIECE 2 ------------------------------------------------

-----------------------------------------------------------
```

---

## Section C — the images

- Cloudinary links only, in full, starting `https://res.cloudinary.com/dmlna04yk/image/upload/`.
  Anything on another host is blocked by the site's security policy and renders
  as a broken image in production even if it looks fine locally.
- Don't add `w_`, `c_` or `f_` transformations to the link — the site adds its
  own per screen size, and a link that already carries one gets left alone at
  full weight.
- The **main photo** of the first colourway is what the shop grid, search
  results, the Google Merchant feed and the WhatsApp/Facebook preview card all
  use. Give that one the best straight-on shot of the piece.
- Extra photos are the ones behind the arrows on the product page: angles,
  detail of the stitching, the piece in a room. Any number.
- Squarish or 4:3 works best. The 1200x630 social card is cropped for you.

---

## What I do, so you don't have to write it

- Titles and URL slugs, if you leave them blank
- Creating the variant group and wiring the size and style buttons together
- The canonical category — one URL per product, so it doesn't compete with
  itself in Google
- Sitemap and Google Merchant feed entries
- The made-to-order block, the fabric picker, the free swatch offer and the
  14-day cancellation exemption notice
- The delivery estimate, the returns copy and the cash-on-delivery lines

## What isn't in this document on purpose

- **Fabric list.** It comes from the library automatically. Tell me only if a
  particular collection should *not* be offered on this range.
- **Stock numbers.** Nothing here is counted — it's made when it's ordered. A
  piece is either listed or it isn't.
- **Delivery times and prices.** Site-wide, not per product.

---

# Worked example

The Verona range as it exists today, written in the format above, so you can see
what a filled-in brief looks like.

```
Range name:              Verona Sofa
Second axis name:        Style
Made to order:           Yes
Where it's made:         UK
Default categories:      Fabric Sofas
```

Shared specifications:

```
Material:                 Fabric
All Cushions Included:    ✓
```

```
-- PIECE 1 ------------------------------------------------
Size:                3 Seater
Style:               High Back
Price (£):           419.00
Dimensions:          L:198cm H:97cm D:99cm
Spec overrides:      Style: High Back

Photographed in:
  Colour name:       Grey
  Colour swatch hex: #7d7d7d
  Material:          Fabric
  SKU:               VHB3-G
  Main photo:        https://res.cloudinary.com/dmlna04yk/image/upload/v1787513319/Verona-3-seater-high-back-sofa-grey_qq082a.jpg
-----------------------------------------------------------

-- PIECE 2 ------------------------------------------------
Size:                3 Seater
Style:               Scattered Back
Price (£):           399.00
Dimensions:          L:198cm H:97cm D:94cm
Spec overrides:      Style: Scattered Back

Photographed in:
  Colour name:       Grey
  Colour swatch hex: #7d7d7d
  Material:          Fabric
  SKU:               VSB3-G
  Main photo:        https://res.cloudinary.com/dmlna04yk/image/upload/v1787513326/Verona-3-seater-scattered-back-sofa-grey_bdwses.jpg
-----------------------------------------------------------

-- PIECE 3 ------------------------------------------------
Size:                4 Seater Corner 1c2
Style:               High Back
Price (£):           529.00
Dimensions:          190cm x 240cm H:90cm D:95cm
Categories:          Fabric Sofas, Corner Settees
Spec overrides:      Style: High Back

Photographed in:
  Colour name:       Grey
  Colour swatch hex: #7d7d7d
  Material:          Fabric
  SKU:               VHB4C-G
  Main photo:        https://res.cloudinary.com/dmlna04yk/image/upload/...
-----------------------------------------------------------
```

Fourteen of those blocks is the whole Verona range: seven sizes x two back
styles.
