// src/constants/homeArt.ts
//
// ─────────────────────────────────────────────────────────────────────────────
//  THE HOMEPAGE ART SLOTS
// ─────────────────────────────────────────────────────────────────────────────
//
// Four pieces of commissioned artwork the new homepage is designed around.
// Paste the Cloudinary URL into the slot and the section upgrades itself.
//
// EVERY SLOT IS OPTIONAL. Each one is null today and every section that reads
// this file has a designed fallback — the hero falls back to a framed
// photograph of the newest product, the stats band and the closing panel fall
// back to the gradient alone. Nothing here is allowed to be the reason a
// section looks broken, so a slot can be filled in whenever the image exists
// rather than all four at once.
//
// The generation prompt for each one is written directly above it. They are
// written to a shared brief so the four read as one set:
//
//   · The palette is the site's own — unbleached calico #FBFAF7, near-black
//     ink #191C1B, ember amber #D4871A. No cool white, no grey, no chrome.
//   · One light source, warm, low and from the left. Long soft shadows.
//   · British, current, understated. Not American showroom, not Scandinavian
//     minimal, not a render of a lobby in Dubai.
//   · Photographic. Real fabric with real weave, real dust in the light.
//     Nothing that looks like a 3D render or an illustration.

/** A slot is either a Cloudinary URL or null. Never an empty string. */
type ArtSlot = string | null;

export interface HomeArt {
  heroSofa: ArtSlot;
  heroRoom: ArtSlot;
  statsTexture: ArtSlot;
  closingRoom: ArtSlot;
}

// export interface HomeArt {
//   heroSofa: "https://res.cloudinary.com/dmlna04yk/image/upload/v1787871185/heroSofa_oyigb4.png";
//   heroRoom: "https://res.cloudinary.com/dmlna04yk/image/upload/v1787871184/heroRoom_lr9z1y.png";
//   statsTexture: "https://res.cloudinary.com/dmlna04yk/image/upload/v1787871194/statsTexture_mc6hcz.png";
//   closingRoom: "https://res.cloudinary.com/dmlna04yk/image/upload/v1787871184/closingRoom_jmajgr.png";
// }

export const HOME_ART: HomeArt = {
  // ═══════════════════════════════════════════════════════════════════════
  //  1. THE HERO SOFA  —  the single most important image on the site
  // ═══════════════════════════════════════════════════════════════════════
  //
  // A CUT-OUT on a TRANSPARENT background, exported as PNG. This is the one
  // hard requirement: the hero floats it over a dark gradient stage with its
  // own pool of light and contact shadow beneath it, so any background baked
  // into the file will show as a rectangle and ruin the effect.
  //
  // Aspect: landscape, roughly 3:2. Upload at 2400px wide or more.
  //
  // ── PROMPT ─────────────────────────────────────────────────────────────
  // Product photograph of a modern British corner sofa, cut out on a fully
  // transparent background, PNG with alpha. Three-quarter front view from
  // slightly above seat height, angled so the chaise runs to the right of
  // frame. Upholstered in a warm oatmeal boucle with a visible weave; deep
  // seat cushions with a soft natural slump, four scatter cushions in
  // toasted amber and charcoal. Slim tapered solid oak legs. Studio lit with
  // one large softbox low and to the left, warm 3200K, a second dim fill on
  // the right so the far arm does not go black. Crisp focus front to back,
  // fabric texture clearly resolved, no motion blur. No floor, no wall, no
  // shadow baked into the image, no reflection, no props, no plants, no
  // people, no watermark, no text. Clean alpha edge around the legs.
  // ───────────────────────────────────────────────────────────────────────
  heroSofa: "https://res.cloudinary.com/dmlna04yk/image/upload/v1787871185/heroSofa_oyigb4.png",

  // ═══════════════════════════════════════════════════════════════════════
  //  2. THE HERO ROOM  —  depth behind the aurora
  // ═══════════════════════════════════════════════════════════════════════
  //
  // Sits behind the drifting gradient at very low opacity, blown out and
  // barely legible. Its whole job is to stop the dark stage reading as flat
  // colour — you should feel a room back there without being able to name
  // anything in it. Nothing important may be near the centre, because the
  // sofa and the headline cover it.
  //
  // Aspect: wide, 16:9 or wider. 2400px+.
  //
  // ── PROMPT ─────────────────────────────────────────────────────────────
  // Interior photograph of an empty modern British living room at dusk,
  // shot wide and slightly underexposed. Bare plastered walls in a warm
  // off-white, a tall sash window to the left throwing a long shelf of low
  // amber sunlight across a pale oak floor, dust visible in the beam. Deep
  // shadow filling the right two thirds of the frame. No furniture, no
  // sofa, no rug, no people, no plants, no artwork on the walls. Shallow
  // depth of field, 35mm, natural film grain, muted warm palette of
  // off-white, deep charcoal and amber. Nothing in the centre of the frame.
  // ───────────────────────────────────────────────────────────────────────
  heroRoom: "https://res.cloudinary.com/dmlna04yk/image/upload/v1787871184/heroRoom_lr9z1y.png",

  // ═══════════════════════════════════════════════════════════════════════
  //  3. THE STATS TEXTURE  —  fabric, close enough to touch
  // ═══════════════════════════════════════════════════════════════════════
  //
  // A full-bleed macro behind the figures band. Runs at low opacity under an
  // ink gradient, so it reads as texture rather than as a photograph. This is
  // the one place on the homepage where the weave is the subject.
  //
  // Aspect: wide, 21:9 ideally. 2400px+.
  //
  // ── PROMPT ─────────────────────────────────────────────────────────────
  // Extreme macro photograph of upholstery fabric, filling the whole frame.
  // A heavy oatmeal boucle weave running diagonally, individual loops and
  // slubs clearly resolved, a few loose fibres catching the light. Raking
  // warm light from the left at a very low angle so every loop casts its own
  // small shadow and the surface reads as deeply three-dimensional. Colour
  // is unbleached natural cream with amber highlights in the raking light
  // and near-black in the troughs. No seams, no stitching, no piping, no
  // buttons, no labels, no hands, no text. Tack sharp, high detail, no
  // vignette.
  // ───────────────────────────────────────────────────────────────────────
  statsTexture: "https://res.cloudinary.com/dmlna04yk/image/upload/v1787871194/statsTexture_mc6hcz.png",

  // ═══════════════════════════════════════════════════════════════════════
  //  4. THE CLOSING ROOM  —  the last thing they see
  // ═══════════════════════════════════════════════════════════════════════
  //
  // Behind the final call to action, dimmed hard under the ink gradient. This
  // is the aspirational one: the room the sofa is going to, photographed as
  // if someone lives in it.
  //
  // Aspect: wide, 16:9. 2400px+.
  //
  // ── PROMPT ─────────────────────────────────────────────────────────────
  // Interior photograph of a lived-in British living room in the evening,
  // shot from the doorway. A large fabric corner sofa in warm oatmeal sits
  // against the far wall under a single low warm lamp; a folded throw over
  // one arm, a book face down on the seat, a mug on a low oak table. Bare
  // walls in warm off-white, wide pale oak boards, one tall window with the
  // curtain half drawn on a blue dusk outside. Warm interior light against
  // cool window light. Nobody in the room. 35mm, natural film grain, deep
  // shadows, no ceiling light, no television, no clutter, no text, no
  // watermark.
  // ───────────────────────────────────────────────────────────────────────
  closingRoom: "https://res.cloudinary.com/dmlna04yk/image/upload/v1787871184/closingRoom_jmajgr.png",
};

/**
 * True when a slot has actually been filled in.
 *
 * Guards against the two ways these go wrong in practice: the slot is still
 * null, or somebody pasted an empty string over it and the section then
 * renders an `<Image>` pointed at nothing.
 */
export function hasArt(slot: ArtSlot): slot is string {
  return typeof slot === 'string' && slot.trim().length > 0;
}
