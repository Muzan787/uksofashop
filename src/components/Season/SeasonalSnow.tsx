// src/components/Season/SeasonalSnow.tsx
//
// Natural-looking snow behind a seasonal band (15 Nov 2026 rebuild: the first
// version was a tile of round gradient dots, which read as white specks).
// Three layers of original six-armed flake artwork - far (fine powder), middle
// (clearly flakes) and near (a few larger, slightly soft) - fall at speeds that
// follow their size, with a slow sideways drift. The rules live in globals.css
// under .season-snow. Decoration only:
//   - aria-hidden and pointer-events-none, so it is invisible to assistive
//     technology and can never block a tap;
//   - pure CSS on three transformed layers: no JavaScript, no layout work;
//   - sits behind the band's content, so it cannot cover text, a price or a
//     button (callers put their content in a `relative` wrapper after it);
//   - phones get the middle layer only; reduced motion gets it still;
//   - never mounted in the basket, checkout or admin.
export default function SeasonalSnow({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`season-snow pointer-events-none absolute inset-x-0 top-0 overflow-hidden ${className}`}>
      <i className="snow-far" />
      <i className="snow-mid" />
      <i className="snow-near" />
    </div>
  )
}
