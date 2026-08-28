'use client'
// src/components/Motion/SplitText.tsx

import { forwardRef, useCallback, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { DUR, EASE, STAGGER_STEP } from './tokens'
import { useReducedMotionSafe } from './useReducedMotionSafe'


export interface SplitTextProps extends Omit<React.HTMLAttributes<HTMLElement>, 'children'> {
  /** The heading text. A string, because it has to be split. */
  text: string
  /**
   * How the text is broken up.
   *
   * 'line' splits on newlines in the source string rather than on rendered
   * line boxes — where the copy breaks is an authoring decision, and measuring
   * wrapped lines would re-split on every resize and fight the reveal.
   */
  by?: 'word' | 'char' | 'line'
  /** Seconds before the first unit starts. */
  delay?: number
  /** Seconds between units. Characters want a shorter step than words. */
  step?: number
  once?: boolean
  amount?: number
  /** The element to render. Headings should say so. */
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'div'
  /**
   * One word inside the text that gets its own treatment — the hero sets
   * "Comfort" in italic ember. Matched case-insensitively with punctuation
   * ignored, so "Art." still matches "art".
   *
   * It has to live here rather than in the caller's markup: the whole point of
   * this component is that it owns the split, and a caller that pre-split the
   * string to style one word would break the single aria-label.
   */
  emphasise?: string
  /** Classes applied to the emphasised word. */
  emphasisClassName?: string
  className?: string
}

/**
 * Reveals a heading by wiping each word or character up from behind a mask.
 *
 * Every unit sits in an overflow-hidden span and slides from 100% to 0, so the
 * letters appear to rise out of the line rather than fade in place. That is the
 * one entrance on the site that is allowed to be showy, and it is reserved for
 * the hero and section headings.
 *
 * The whole string is on aria-label and the pieces are aria-hidden, so a screen
 * reader hears one heading rather than eleven fragments. Under reduced motion
 * it renders as plain text with no wrapper spans at all.
 */
export const SplitText = forwardRef<HTMLElement, SplitTextProps>(function SplitText(
  { text, by = 'word', delay = 0, step, once = true, amount = 0.4, as = 'span', emphasise, emphasisClassName = '', className, ...rest },
  ref,
) {
  const reduced = useReducedMotionSafe()
  const Tag = as as React.ElementType

  /**
   * THE ELEMENT BEING WATCHED IS THE HEADING, NOT THE PIECES.
   *
   * Each piece starts translated 110% down inside an `overflow: hidden` mask,
   * so before anything moves it is entirely outside its own parent's clip
   * rectangle. IntersectionObserver intersects a target against the clip rects
   * of ALL its ancestors, which means a fully clipped element reports a ratio
   * of exactly zero — so the `whileInView` this used to carry per piece could
   * never fire, nothing ever moved, and nothing ever became visible to make it
   * fire. Every SplitText heading on the site was permanently invisible while
   * holding open the exact space it should have filled: the hero headline, all
   * five homepage section headings and the category page hero.
   *
   * The heading itself is clipped by nothing, so watching that instead is
   * always true when the words are on screen. The pieces then animate off a
   * plain boolean, each keeping its own delay — which is what preserves the
   * word-by-word stagger.
   *
   * A plain boolean rather than variant propagation from a motion-wrapped
   * heading. Propagation is the idiomatic answer and would be tidier, but it
   * depends on context reaching each piece through the plain mask spans that
   * sit between them — one more thing that has to be true for the words to be
   * visible at all. Given what the failure mode here costs, this is the version
   * with the fewest ways to go wrong.
   */
  const box = useRef<HTMLElement>(null)
  const inView = useInView(box, { once, amount })

  // The caller's ref and the observer both need the heading node.
  const setRefs = useCallback(
    (node: HTMLElement | null) => {
      box.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) (ref as React.MutableRefObject<HTMLElement | null>).current = node
    },
    [ref],
  )

  const normalise = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/gi, '')
  const key = emphasise ? normalise(emphasise) : ''
  const isEmphasised = (unit: string) => key !== '' && normalise(unit) === key

  if (reduced) {
    // Still emphasised — the preference is about movement, not typography.
    return (
      <Tag
        ref={ref}
        className={className}
        // Authored newlines still break where they were written.
        style={by === 'line' ? { whiteSpace: 'pre-line' } : undefined}
        {...rest}
      >
        {key
          ? text.split(/(\s+)/).map((u, i) =>
              isEmphasised(u) ? <span key={i} className={emphasisClassName}>{u}</span> : u,
            )
          : text}
      </Tag>
    )
  }

  // Characters need a tighter step or a long word takes a second to land.
  const gap = step ?? (by === 'char' ? STAGGER_STEP / 3 : STAGGER_STEP)

  // Split on the separator but keep it, so spacing survives the wrap.
  const units =
    by === 'line' ? text.split('\n')
    : by === 'word' ? text.split(/(\s+)/)
    : Array.from(text)

  return (
    <Tag
      ref={setRefs}
      className={className}
      aria-label={text.replace(/\n/g, ' ')}
      {...rest}
    >
      {units.map((unit, i) => {
        // Whitespace is rendered as-is; wrapping it breaks line-breaking.
        if (/^\s+$/.test(unit)) return <span key={i}>{unit}</span>

        return (
          <span
            key={i}
            aria-hidden="true"
            // A line is its own block, so the mask clips a whole line at a
            // time rather than each word inside it.
            style={
              by === 'line'
                ? { display: 'block', overflow: 'hidden' }
                : { display: 'inline-block', overflow: 'hidden', verticalAlign: 'bottom' }
            }
          >
            <motion.span
              data-motion="split"
              // A whole line is never itself the emphasised word, so splitting
              // by line puts the emphasis one level in — see below.
              className={by !== 'line' && isEmphasised(unit) ? emphasisClassName : undefined}
              // No will-change. It was set on every piece, and a heading is
              // eleven pieces — so nine headings held ninety-odd elements on
              // their own compositor layers for the entire session, long after
              // the half-second they were animating for. That is GPU memory a
              // phone does not have, and it made the whole site feel heavy.
              // Framer promotes an element for the duration of the animation
              // on its own; it does not need to be told to keep it forever.
              style={{ display: by === 'line' ? 'block' : 'inline-block' }}
              initial={{ y: '110%' }}
              animate={inView ? { y: '0%' } : { y: '110%' }}
              transition={{ duration: DUR.settle, ease: EASE.out, delay: delay + i * gap }}
            >
              {/* `emphasise` used to be silently ignored whenever `by` was
                  'line': the unit being compared is the entire line, and
                  "Your perfect sofa" never equals "sofa". Both callers that
                  split by line asked for an emphasised word and neither got
                  one. The line still animates as one block — only the word
                  inside it is marked. */}
              {by === 'line' && key
                ? unit.split(/(\s+)/).map((word, j) =>
                    isEmphasised(word)
                      ? <span key={j} className={emphasisClassName}>{word}</span>
                      : word,
                  )
                : unit}
            </motion.span>
          </span>
        )
      })}
    </Tag>
  )
})
