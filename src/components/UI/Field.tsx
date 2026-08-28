'use client';
// src/components/UI/Field.tsx
//
// One field, for the whole site.
//
// It replaces seven: contact and login each had their own `inputStyle()`
// helper, signup a third, the size guide styled every input inline, the guest
// review form a fourth, the footer's newsletter a fifth and the checkout a
// sixth — with the result that no two forms on the site were the same height,
// the same colour, or focused the same way. Several used a placeholder in
// place of a label, which vanishes the moment anybody types.

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { AlertCircle, Check, Eye, EyeOff, Loader2, Paperclip, Upload, X } from 'lucide-react';

export type FieldType =
  | 'text' | 'email' | 'tel' | 'number' | 'password'
  | 'textarea' | 'select' | 'checkbox' | 'radio' | 'file';

export interface Option {
  value: string;
  label: string;
}

interface Props {
  label: string;
  name: string;
  type?: FieldType;
  /**
   * Omit to leave the control uncontrolled.
   *
   * Half the forms on this site post a FormData straight to a server action
   * and hold no state at all; the other half are controlled. A field that
   * insisted on one of those would have meant rewriting the state management
   * of four pages to change how they look.
   */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** checkbox and radio only. */
  checked?: boolean;
  onCheck?: (checked: boolean) => void;
  /** select and radio only. */
  options?: Option[];
  /** file only. */
  file?: File | null;
  onFile?: (file: File | null) => void;
  accept?: string;

  required?: boolean;
  disabled?: boolean;
  error?: string;
  /** Shown with a sage tick. For "postcode found", "email confirmed". */
  success?: string;
  hint?: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  uppercase?: boolean;
  maxLength?: number;
  min?: number;
  max?: number;
  rows?: number;
  className?: string;
}

/**
 * The shell every text-shaped control wears.
 *
 * 56px, Calico 100, a 1px Calico 300 hairline that draws to Ember 700 over
 * 220ms on focus. Ember 700 rather than Ember 500 deliberately: Ember 500 is
 * 2.9:1 against a light ground, which is under the 3:1 a focus indicator has
 * to meet.
 */
const SHELL =
  'w-full rounded-sm border bg-calico-100 text-body text-ink-900 outline-none ' +
  'transition-[border-color,box-shadow] duration-swift ease-out-expo ' +
  'disabled:cursor-not-allowed disabled:opacity-60';

function borderFor(error?: string, success?: string) {
  if (error) return 'border-rust-700 shadow-[0_0_0_1px_var(--color-rust-700)]';
  if (success) return 'border-sage-700';
  return 'border-calico-300 focus:border-ember-700 focus:shadow-[0_0_0_1px_var(--color-ember-700)]';
}

export default function Field({
  label, name, type = 'text', value, defaultValue, onChange,
  checked, onCheck, options = [], file, onFile, accept = 'image/*',
  required = false, disabled = false, error, success, hint,
  autoComplete, inputMode, uppercase, maxLength, min, max, rows = 4,
  className,
}: Props) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  // A password field owns its own reveal. Login and signup each had their own
  // eye button wired to their own state; there is one now, and it is the same
  // one in both places.
  const [revealed, setRevealed] = useState(false);
  // Only consulted when the caller is not supplying a value: the label has to
  // know whether there is content, and uncontrolled means nobody is telling it.
  const [filled, setFilled] = useState(Boolean(defaultValue));

  const controlled = value !== undefined;
  const shown = controlled ? value : undefined;

  const handle = (next: string) => {
    if (!controlled) setFilled(next.length > 0);
    onChange?.(next);
  };

  const describedBy = error ? `${id}-error` : success ? `${id}-success` : hint ? `${id}-hint` : undefined;

  // A label that rises rather than a placeholder that disappears. The point is
  // that it is still readable once the field has something in it.
  const floated =
    focused ||
    (controlled ? value.length > 0 : filled) ||
    type === 'select' || type === 'number';

  const shell = `${SHELL} ${borderFor(error, success)}`;
  const shake = error ? { animation: 'field-shake 300ms var(--ease-in-out-quart)' } : undefined;

  // ── The two that are not a box with a label in it ──────────────────────
  if (type === 'checkbox' || type === 'radio') {
    return (
      <div className={className}>
        <label
          htmlFor={id}
          className="flex min-h-11 cursor-pointer items-center gap-3 text-body-sm text-ink-900"
        >
          <input
            id={id}
            name={name}
            type={type}
            checked={Boolean(checked)}
            required={required}
            disabled={disabled}
            onChange={e => onCheck?.(e.target.checked)}
            aria-describedby={describedBy}
            aria-invalid={Boolean(error)}
            className="h-11 w-11 shrink-0 cursor-pointer accent-ember-500 disabled:cursor-not-allowed"
          />
          <span className="flex-1">{label}</span>
        </label>
        <Messages id={id} error={error} success={success} hint={hint} />
      </div>
    );
  }

  if (type === 'file') {
    return (
      <div className={className}>
        <FileField
          id={id}
          name={name}
          label={label}
          file={file ?? null}
          onFile={onFile}
          accept={accept}
          disabled={disabled}
          error={error}
        />
        <Messages id={id} error={error} success={success} hint={hint} />
      </div>
    );
  }

  // ── Everything else ────────────────────────────────────────────────────
  return (
    <div className={className}>
      {/* Keyed on the message, so a NEW error shakes and a persisting one does
          not — a field that shakes on every keystroke while you are fixing it
          is punishing you for trying. */}
      <div className="relative" key={error || 'ok'} style={shake}>
        {type === 'textarea' && (
          <textarea
            id={id}
            name={name}
            rows={rows}
            value={shown}
            defaultValue={controlled ? undefined : defaultValue}
            required={required}
            disabled={disabled}
            maxLength={maxLength}
            onChange={e => handle(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            className={`${shell} resize-y px-3 pb-2 pt-6 leading-relaxed`}
          />
        )}

        {type === 'select' && (
          <select
            id={id}
            name={name}
            value={shown}
            defaultValue={controlled ? undefined : defaultValue}
            required={required}
            disabled={disabled}
            onChange={e => handle(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            className={`${shell} h-14 appearance-none px-3 pb-1 pt-5`}
          >
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}

        {type !== 'textarea' && type !== 'select' && (
          <input
            id={id}
            name={name}
            type={type === 'password' && revealed ? 'text' : type}
            value={shown}
            defaultValue={controlled ? undefined : defaultValue}
            required={required}
            disabled={disabled}
            inputMode={inputMode}
            autoComplete={autoComplete}
            maxLength={maxLength}
            min={min}
            max={max}
            onChange={e => handle(uppercase ? e.target.value.toUpperCase() : e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            className={`${shell} h-14 pb-1 pl-3 pt-5 ${type === 'password' ? 'pr-14' : 'pr-3'} ${uppercase ? 'uppercase tracking-[0.06em]' : ''}`}
          />
        )}

        {type === 'password' && (
          <button
            type="button"
            onClick={() => setRevealed(r => !r)}
            aria-label={revealed ? 'Hide password' : 'Show password'}
            aria-pressed={revealed}
            className="hover-icon absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-sm text-ink-500"
          >
            {revealed
              ? <EyeOff aria-hidden="true" className="h-4 w-4" />
              : <Eye aria-hidden="true" className="h-4 w-4" />}
          </button>
        )}

        <label
          htmlFor={id}
          className={`pointer-events-none absolute left-3 origin-left transition-all duration-swift ease-out-expo ${
            floated ? 'top-1.5 text-caption' : type === 'textarea' ? 'top-5 text-body' : 'top-1/2 -translate-y-1/2 text-body'
          } ${error ? 'text-rust-700' : focused ? 'text-ember-700' : 'text-ink-500'}`}
        >
          {label}
          {required && <span aria-hidden="true"> *</span>}
        </label>

        {success && !error && (
          <Check aria-hidden="true" className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sage-700" />
        )}
      </div>

      <Messages id={id} error={error} success={success} hint={hint} />
    </div>
  );
}

// ─── What the field has to say ───────────────────────────────────────────────
function Messages({ id, error, success, hint }: {
  id: string; error?: string; success?: string; hint?: string;
}) {
  if (error) {
    return (
      <p id={`${id}-error`} role="alert" className="m-0 mt-1.5 flex items-start gap-1.5 text-caption text-rust-700">
        <AlertCircle aria-hidden="true" className="mt-px h-3.5 w-3.5 shrink-0" />
        {error}
      </p>
    );
  }
  if (success) {
    return (
      <p id={`${id}-success`} className="m-0 mt-1.5 flex items-start gap-1.5 text-caption text-sage-700">
        <Check aria-hidden="true" className="mt-px h-3.5 w-3.5 shrink-0" />
        {success}
      </p>
    );
  }
  if (hint) {
    return <p id={`${id}-hint`} className="m-0 mt-1.5 text-caption text-ink-500">{hint}</p>;
  }
  return null;
}

// ─── Files ───────────────────────────────────────────────────────────────────
/**
 * A drop zone that shows you what it took.
 *
 * Every file input on this site was a hidden input behind a label reading
 * "Choose an image", which told you the filename and nothing else — so on a
 * review form the one thing you could not check was whether you had attached
 * the right photograph. This previews it.
 */
function FileField({ id, name, label, file, onFile, accept, disabled, error }: {
  id: string; name: string; label: string;
  file: File | null; onFile?: (f: File | null) => void;
  accept: string; disabled?: boolean; error?: string;
}) {
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  // A preview URL is a handle on a blob: made once per file, and released the
  // moment that file is replaced or the field goes away. One per attempt with
  // no revoke would leak every photograph somebody tried.
  const preview = useMemo(
    () => (file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null),
    [file],
  );
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  return (
    <>
      <span id={`${id}-label`} className="eyebrow mb-2 block text-ink-500">{label}</span>

      <div
        onDragOver={e => { e.preventDefault(); if (!disabled) setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={e => {
          e.preventDefault();
          setOver(false);
          if (disabled) return;
          const dropped = e.dataTransfer.files?.[0];
          if (dropped) onFile?.(dropped);
        }}
        className={`rounded-sm border border-dashed transition-colors duration-swift ease-out-expo ${
          error ? 'border-rust-700 bg-rust-50'
            : over ? 'border-ember-700 bg-ember-50'
            : 'border-calico-300 bg-calico-100'
        }`}
      >
        {file ? (
          <div className="flex items-center gap-3 p-3">
            <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-sm bg-calico-200">
              {preview ? (
                <Image src={preview} alt="" fill sizes="56px" unoptimized className="object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center">
                  <Paperclip aria-hidden="true" className="h-5 w-5 text-ink-500" />
                </span>
              )}
            </span>

            <span className="min-w-0 flex-1">
              <span className="block truncate text-body-sm font-semibold text-ink-900">{file.name}</span>
              <span className="mt-0.5 block font-data text-caption tabular-nums text-ink-500">
                {(file.size / 1024).toFixed(0)} KB
              </span>
            </span>

            <button
              type="button"
              onClick={() => { onFile?.(null); if (input.current) input.current.value = ''; }}
              aria-label={`Remove ${file.name}`}
              className="hover-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-sm text-ink-500 hover:text-rust-700"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <label
            htmlFor={id}
            className="flex cursor-pointer flex-col items-center gap-1.5 px-4 py-6 text-center"
          >
            <Upload aria-hidden="true" className="h-5 w-5 text-ink-500" />
            <span className="text-body-sm font-semibold text-ink-900">Choose a photo</span>
            <span className="text-caption text-ink-500">or drag one here</span>
          </label>
        )}

        <input
          ref={input}
          id={id}
          name={name}
          type="file"
          accept={accept}
          disabled={disabled}
          aria-labelledby={`${id}-label`}
          onChange={e => onFile?.(e.target.files?.[0] ?? null)}
          className="sr-only"
        />
      </div>
    </>
  );
}

// ─── Submit ──────────────────────────────────────────────────────────────────
interface SubmitProps {
  /** "Send", "Create account", "Place order". */
  idle: string;
  /** "Sending", "Creating your account". The present participle. */
  pending: string;
  /** "Sent". Shown briefly once it is done. */
  done?: string;
  state: 'idle' | 'pending' | 'done';
  disabled?: boolean;
  className?: string;
}

/**
 * A submit button that says what it is doing.
 *
 * Three labels rather than a spinner replacing the text: "Send" becoming
 * "Sending" is the clearest possible statement that the press registered, and
 * it costs nothing to say. The spinner sits beside it rather than instead of
 * it, so the button never goes blank.
 */
export function SubmitButton({
  idle, pending, done = 'Done', state, disabled, className,
}: SubmitProps) {
  const label = state === 'pending' ? pending : state === 'done' ? done : idle;

  return (
    <button
      type="submit"
      disabled={disabled || state !== 'idle'}
      aria-live="polite"
      className={`hover-btn flex h-14 w-full items-center justify-center gap-3 rounded-sm font-data text-eyebrow font-bold uppercase tracking-[0.1em] transition-colors duration-base ease-out-expo disabled:opacity-80 ${
        state === 'done' ? 'bg-sage-700 text-calico-50' : 'bg-ember-500 text-ink-900'
      } ${className ?? ''}`}
    >
      {state === 'pending' && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
      {state === 'done' && <Check aria-hidden="true" className="h-4 w-4" />}
      {label}
    </button>
  );
}
