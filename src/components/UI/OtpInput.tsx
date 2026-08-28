'use client'
// src/components/UI/OtpInput.tsx

import { useEffect, useRef, useState } from 'react'

const LENGTH = 6

interface Props {
  /** The hidden field the form posts. */
  name?: string
  value: string
  onChange: (value: string) => void
  /** Fires once all six are filled, so the form can submit itself. */
  onComplete?: () => void
  disabled?: boolean
  error?: boolean
  /** Named in the label and announced with the group. */
  label?: string
}

/**
 * Six boxes rather than one field.
 *
 * A single input with maxLength 6 gives no sense of how long the code is or
 * how much of it has been typed, and on a phone it sits at the same size as
 * every other field while being the only thing on the screen. Six boxes are
 * self-counting.
 *
 * The parts that are easy to get wrong, and that a bare row of inputs gets
 * wrong: pasting a code has to fill all six, not put six characters in the
 * first; iOS SMS autofill arrives as one multi-character change and has to be
 * distributed the same way; backspace on an empty box has to step back and
 * clear the one before it, or a mistyped code can only be fixed by clicking;
 * and every box needs its own label, because "3" on its own tells a screen
 * reader nothing.
 */
export default function OtpInput({
  name = 'otp', value, onChange, onComplete, disabled, error, label = 'Verification code',
}: Props) {
  const boxes = useRef<(HTMLInputElement | null)[]>([])
  const [focused, setFocused] = useState<number | null>(null)
  const fired = useRef(false)

  const digits = value.padEnd(LENGTH, ' ').slice(0, LENGTH).split('')

  useEffect(() => {
    if (value.length === LENGTH && !fired.current) {
      fired.current = true
      onComplete?.()
    }
    if (value.length < LENGTH) fired.current = false
  }, [value, onComplete])

  /** Writes `text` into the boxes starting at `from`, ignoring non-digits. */
  function write(from: number, text: string) {
    const clean = text.replace(/\D/g, '')
    if (!clean) return

    const next = value.padEnd(LENGTH, ' ').split('')
    for (let i = 0; i < clean.length && from + i < LENGTH; i++) {
      next[from + i] = clean[i]
    }
    const joined = next.join('').trimEnd()
    onChange(joined)

    const landed = Math.min(from + clean.length, LENGTH - 1)
    boxes.current[landed]?.focus()
    boxes.current[landed]?.select()
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const next = value.padEnd(LENGTH, ' ').split('')
      // Clear this box if it has something in it; otherwise step back and
      // clear the one before, which is what backspace does everywhere else.
      if (next[i] !== ' ' && next[i] !== undefined) {
        next[i] = ' '
      } else if (i > 0) {
        next[i - 1] = ' '
        boxes.current[i - 1]?.focus()
      }
      onChange(next.join('').trimEnd())
    } else if (e.key === 'ArrowLeft' && i > 0) {
      e.preventDefault()
      boxes.current[i - 1]?.focus()
    } else if (e.key === 'ArrowRight' && i < LENGTH - 1) {
      e.preventDefault()
      boxes.current[i + 1]?.focus()
    }
  }

  return (
    <div>
      <span id="otp-label" className="block font-data text-eyebrow uppercase tracking-[0.14em] text-ink-500">
        {label}
      </span>

      <div
        role="group"
        aria-labelledby="otp-label"
        className={`mt-3 flex gap-2 ${error ? 'motion-safe:animate-[field-shake_300ms_var(--ease-out-expo)]' : ''}`}
      >
        {digits.map((d, i) => {
          const filled = d !== ' '
          return (
            <input
              key={i}
              ref={el => { boxes.current[i] = el }}
              value={filled ? d : ''}
              onChange={e => write(i, e.target.value)}
              onKeyDown={e => onKeyDown(i, e)}
              onPaste={e => { e.preventDefault(); write(0, e.clipboardData.getData('text')) }}
              onFocus={e => { setFocused(i); e.target.select() }}
              onBlur={() => setFocused(null)}
              disabled={disabled}
              // Only the first carries it: Safari fills the whole code into
              // whichever box owns the attribute, and `write` spreads it.
              autoComplete={i === 0 ? 'one-time-code' : 'off'}
              inputMode="numeric"
              // Not maxLength 1 — autofill and paste arrive as one change and
              // would be truncated to a single digit before `write` saw them.
              aria-label={`Digit ${i + 1} of ${LENGTH}`}
              className={`h-14 w-full min-w-0 rounded-sm border bg-calico-100 text-center font-data text-h3 font-bold tabular-nums text-ink-900 outline-none transition-[border-color,box-shadow] duration-swift ease-out-expo disabled:opacity-60 ${
                error
                  ? 'border-rust-700 shadow-[0_0_0_1px_var(--color-rust-700)]'
                  : focused === i
                    ? 'border-ember-700 shadow-[0_0_0_1px_var(--color-ember-700)]'
                    : filled
                      ? 'border-ink-400'
                      : 'border-calico-300'
              }`}
            />
          )
        })}
      </div>

      {/* What the form actually posts. The boxes are the interface; this is
          the value, so nothing downstream has to know there were six of them. */}
      <input type="hidden" name={name} value={value} />
    </div>
  )
}
