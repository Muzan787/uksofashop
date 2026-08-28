// src/components/Motion/index.ts
//
// The motion vocabulary. Nine primitives, one grammar — see the motion tokens
// in src/styles/tokens.css for the durations and easings they all draw from.
//
// Every one of them:
//   · takes a className and forwards a ref;
//   · renders its final state, unanimated, under prefers-reduced-motion;
//   · leaves its children in the document whether or not the animation runs.
//
// That last point is the rule the rest of them exist to protect. Nothing here
// may be the reason a visitor cannot see something.

export { Reveal, type RevealProps } from './Reveal'
export { Stagger, type StaggerProps } from './Stagger'
export { SplitText, type SplitTextProps } from './SplitText'
export { Parallax, type ParallaxProps } from './Parallax'
export { Magnetic, type MagneticProps } from './Magnetic'
export { Marquee, type MarqueeProps } from './Marquee'
export { CountUp, type CountUpProps } from './CountUp'
export { Curtain, type CurtainProps } from './Curtain'
export { ImageReveal, type ImageRevealProps } from './ImageReveal'

export { DUR, EASE, STAGGER_STEP, STAGGER_CAP, staggerDelay } from './tokens'
export { usePointerFine } from './usePointerFine'
export { useReducedMotionSafe } from './useReducedMotionSafe'
export { productTransitionName } from './productTransition'
export { default as Cursor } from './Cursor'
