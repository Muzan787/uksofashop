'use client'
// src/components/Season/ChristmasTree.tsx
//
// The homepage hero's Christmas tree (Run 7 replacement of the four-tier
// cartoon). The artwork is public/season/tree.svg: original, generated from
// hundreds of needle tufts on drooping branches with back-to-front shading, a
// warm fairy-light garland, glass baubles in the shop's ember, mulberry, gold
// and calico, a brass star and a woven pot. One cached image, no JavaScript;
// the lights twinkle by opacity inside the SVG and stop under reduced motion.
//
// Two placements, both decoration only (alt="", aria-hidden, no pointer
// events), drawn only between 14 Nov and 25 Dec:
//   - 'stage' (640px and up): beside and behind the sofa (Hero.tsx mounts it
//     before the sofa, so the sofa paints over it);
//   - 'phone' (360px to 639px): a small tree in the gap beside the first line
//     of the headline. Hidden under 360px, where there is no gap to use.
// fetchPriority low: never competes with the hero photograph for bandwidth.
import { useSeasonPhase } from './useSeasonPhase'

export default function ChristmasTree({ variant, className = '' }: { variant: 'stage' | 'phone'; className?: string }) {
  const phase = useSeasonPhase()
  if (phase === 'off') return null
  const visibility = variant === 'stage' ? 'hidden sm:block' : 'hidden min-[360px]:block sm:hidden'
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a static decorative SVG; next/image adds nothing here
    <img
      src="/season/tree.svg"
      alt=""
      aria-hidden="true"
      draggable={false}
      decoding="async"
      fetchPriority="low"
      data-tree={variant}
      className={`pointer-events-none absolute select-none ${visibility} ${className}`}
    />
  )
}
