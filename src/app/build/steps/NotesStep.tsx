'use client'
// src/app/build/steps/NotesStep.tsx

import { AnimatePresence, motion } from 'framer-motion'
import { Check, MessageSquareText, PencilRuler, Ruler, type LucideIcon } from 'lucide-react'
import Field from '@/components/UI/Field'
import { DUR, EASE } from '@/components/Motion'
import { useReducedMotionSafe } from '@/components/Motion/useReducedMotionSafe'
import type { Draft } from '../state'
import { StepHeading } from './ui'

type NoteKey = keyof Draft['notes']

interface Props {
  notes: Draft['notes']
  onToggle: (key: NoteKey, on: boolean) => void
  onText: (key: NoteKey, text: string) => void
}

const NOTES: { key: NoteKey; icon: LucideIcon; title: string; detail: string; label: string; hint: string }[] = [
  {
    key: 'dimensions',
    icon: Ruler,
    title: 'Custom dimensions',
    detail: 'A different width, depth or seat height from the one listed.',
    label: 'The measurements you need',
    hint: 'Width, depth, height — whatever matters. Centimetres or inches, either is fine.',
  },
  {
    key: 'design',
    icon: PencilRuler,
    title: 'Changes to the design',
    detail: 'Different arms, no buttons, an extra cushion, a firmer seat.',
    label: 'What you would change',
    hint: 'Say it the way you would say it to us in the showroom. We will work out the how.',
  },
  {
    key: 'other',
    icon: MessageSquareText,
    title: 'Something else',
    detail: 'Anything at all you want us to know before we ring.',
    label: 'Your note',
    hint: 'A matching footstool, a deadline, a tricky staircase — anything.',
  },
]

/**
 * Step six: the things a form cannot ask.
 *
 * Three headings and three boxes. None is required, and none is priced -
 * every one of them is a note for the phone call, which is where anything
 * off the catalogue actually gets specified and quoted. The step exists so
 * the customer says it once, in their own words, before the call, and the
 * call starts from their note rather than from nothing.
 */
export default function NotesStep({ notes, onToggle, onText }: Props) {
  const reduced = useReducedMotionSafe()
  const transition = { duration: reduced ? 0 : DUR.base, ease: EASE.out }

  return (
    <div>
      <StepHeading
        eyebrow="Step 6 of 7"
        title="Anything else?"
        lead="Tick what applies and tell us in a line or two. None of it is priced here — we go through all of it on the phone before anything is made."
      />

      <ul role="list" className="m-0 flex list-none flex-col gap-3 p-0">
        {NOTES.map(note => {
          const state = notes[note.key]
          const Icon = note.icon
          return (
            <li key={note.key}>
              <div
                className={`rounded-md border transition-[border-color,background-color,box-shadow] duration-swift ease-out-expo ${
                  state.on
                    ? 'border-ember-500 bg-ember-50 shadow-[0_0_0_1px_var(--color-ember-500)]'
                    : 'border-calico-300 bg-calico-50 shadow-e1'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onToggle(note.key, !state.on)}
                  aria-pressed={state.on}
                  className="hover-btn flex w-full cursor-pointer items-center gap-4 border-0 bg-transparent p-4 text-left"
                >
                  <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-sm ${state.on ? 'bg-ember-500/20 text-ember-700' : 'bg-calico-200 text-ink-500'}`}>
                    <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-body-sm font-semibold text-ink-900">{note.title}</span>
                    <span className="mt-0.5 block text-caption leading-snug text-ink-500">{note.detail}</span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-pill border transition-[background-color,border-color] duration-swift ease-out-expo ${
                      state.on ? 'border-ember-500 bg-ember-500 text-ink-900' : 'border-ink-400 bg-calico-50 text-transparent'
                    }`}
                  >
                    <Check className="h-4 w-4" strokeWidth={3} />
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {state.on && (
                    <motion.div
                      key="box"
                      initial={reduced ? false : { height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={reduced ? undefined : { height: 0, opacity: 0 }}
                      transition={transition}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4">
                        <Field
                          label={note.label}
                          name={`note-${note.key}`}
                          type="textarea"
                          rows={3}
                          value={state.text}
                          onChange={text => onText(note.key, text)}
                          maxLength={600}
                          hint={note.hint}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
