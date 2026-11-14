// src/components/Season/SantaHat.tsx
//
// A small winter hat for the Ask us icon (Run 5, 14 Nov 2026). Original
// artwork, drawn here in three shapes (hat, trim, bobble) in the shop's own
// tokens; no character, no third-party art.
//
// Deliberately inert:
//   - purely decorative: aria-hidden, no title, pointer-events none, so the
//     real Ask us button is the only thing that is clickable or announced;
//   - static: no animation at all, so there is nothing to switch off for
//     reduced motion and no CPU cost;
//   - absolutely positioned over the icon, so it changes no layout and cannot
//     push the pill into WhatsApp, Add to cart, the menu or the cookie banner;
//   - mounted only between 14 Nov and 25 Dec (useSeasonPhase), never in the
//     basket, checkout or admin (those do not render the Ask us pill).
export default function SantaHat({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 20 16"
      className={`pointer-events-none absolute h-3.5 w-[18px] ${className}`}
    >
      {/* the hat */}
      <path d="M3 13 C3 6 8 2 13 3 C15 3.4 16.4 5 16.8 7.2 L17 13 Z" fill="var(--color-ember-700)" />
      {/* the fur trim */}
      <rect x="1.5" y="11.2" width="17" height="3.8" rx="1.9" fill="var(--color-calico-50)" />
      {/* the bobble */}
      <circle cx="16.8" cy="4.6" r="2" fill="var(--color-calico-50)" />
    </svg>
  )
}
