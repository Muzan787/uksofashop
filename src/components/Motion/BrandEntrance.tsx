// src/components/Motion/BrandEntrance.tsx
//
// Deliberately NOT a client component, and deliberately not animated by
// Framer. Everything here is server-rendered markup plus CSS, so the curtain
// is painted on the very first frame rather than waiting for hydration.

/**
 * The once-per-session entrance.
 *
 * The whole design turns on one inversion. This does not render a curtain and
 * then reveal the page behind it — the page renders normally, always, and the
 * curtain is a sibling laid on top that removes itself. The hero is complete
 * and painted underneath for the entire 900ms.
 *
 * Which means the failure modes are all benign:
 *
 *   JavaScript never runs — the pre-paint script in the root layout never adds
 *   `.entrance` to <html>, the curtain stays `display: none`, and the visitor
 *   simply sees the hero. Nothing is waiting on anything.
 *
 *   Reduced motion, a second visit in the same session, or any route other
 *   than the homepage — same thing. The script declines to add the class.
 *
 *   The animation stalls — the curtain is `pointer-events: none` from the
 *   start, so even a frozen one cannot block a tap.
 *
 * This is the opposite of the 3.4s splash it replaces, where the curtain was
 * the thing that rendered and the content queued behind it.
 */
export default function BrandEntrance() {
  return (
    <div className="brand-entrance" aria-hidden="true">
      <div className="brand-entrance__mark">
        <span className="brand-entrance__word">
          UK Sofa<span className="brand-entrance__accent">Shop</span>
        </span>
        <span className="brand-entrance__rule" />
      </div>
    </div>
  )
}
