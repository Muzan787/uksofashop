// src/components/Season/SeasonalSnow.tsx
//
// A quiet fall of snow behind a seasonal band. Decoration only:
//   - aria-hidden and pointer-events-none, so it is invisible to assistive
//     technology and can never block a tap;
//   - pure CSS, no JavaScript, no layout work (transform on one layer);
//   - off for anyone who asks for reduced motion, and off below 640px where a
//     phone is better spent on the page (rules live in globals.css under
//     .season-snow);
//   - never mounted in the basket, checkout or admin.
export default function SeasonalSnow({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`season-snow pointer-events-none absolute inset-x-0 top-0 overflow-hidden ${className}`} />
}
