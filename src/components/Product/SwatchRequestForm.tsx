'use client';
// src/components/Product/SwatchRequestForm.tsx

import { useState } from 'react';
import { Loader2, MapPin, Search, X } from 'lucide-react';
import Field from '@/components/UI/Field';
import { requestSwatches } from '@/app/actions/swatches';
import { lookupAddresses, normalisePostcode } from '@/utils/postcode';
import type { Fabric } from './types';

interface Props {
  samples: Fabric[];
  onRemove: (id: string) => void;
  onSent: () => void;
}

/**
 * Where to post them.
 *
 * The same five questions the checkout asks, minus everything to do with money,
 * because there is none involved. It reuses <Field> and the shared postcode
 * lookup rather than growing a sixth set of form styles - the whole reason
 * Field exists is that this site once had six.
 *
 * The phone number is optional but validated when given. We ring before
 * posting, so a mistyped number costs a sample; no number at all just means we
 * email instead.
 */
export default function SwatchRequestForm({ samples, onRemove, onSent }: Props) {
  const [form, setForm] = useState({
    customerName: '', customerEmail: '', customerPhone: '',
    postcode: '', shippingAddress: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [addresses, setAddresses] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [confirmed, setConfirmed] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState('');

  const set = (k: keyof typeof form) => (v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => { const n = { ...e }; delete n[k]; return n });
  };

  const findAddress = async () => {
    if (form.postcode.trim().length < 5) {
      setErrors(e => ({ ...e, postcode: 'Please enter a valid postcode first.' }));
      return;
    }
    setSearching(true);
    setErrors(e => { const n = { ...e }; delete n.postcode; return n });
    setAddresses([]);
    try {
      setAddresses(await lookupAddresses(form.postcode));
      setConfirmed(normalisePostcode(form.postcode));
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      setConfirmed(null);
      setErrors(e => ({ ...e, postcode: message || 'Lookup failed. Please type your address below.' }));
    } finally {
      setSearching(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setServerError('');

    const res = await requestSwatches({
      ...form,
      fabricIds: samples.map(s => s.id),
    });

    if (res.error) {
      setServerError(res.error);
      setPending(false);
      return;
    }
    onSent();
  };

  return (
    <form onSubmit={submit} noValidate>
      {/* What is being posted, still removable at the last moment. */}
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {samples.map(s => (
          <li
            key={s.id}
            className="flex items-center gap-2 rounded-pill border border-calico-300 bg-calico-100 py-1 pl-1 pr-1"
          >
            <span
              aria-hidden="true"
              className="h-7 w-7 shrink-0 overflow-hidden rounded-pill bg-calico-200"
              style={s.hex ? { background: s.hex } : undefined}
            />
            <span className="text-caption font-semibold text-ink-700">
              {s.collectionName} {s.name}
            </span>
            <button
              type="button"
              onClick={() => onRemove(s.id)}
              aria-label={`Remove ${s.collectionName} ${s.name}`}
              className="hover-icon flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-pill border-0 bg-transparent text-ink-500"
            >
              <X aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>

      <p className="m-0 mt-4 text-caption leading-relaxed text-ink-500">
        Free to anywhere on the UK mainland. Nothing to pay and nothing to send back — we&apos;ll
        ring you once they&apos;re on their way.
      </p>

      <div className="mt-5 flex flex-col gap-4">
        <Field
          label="Full Name" name="customerName"
          value={form.customerName} onChange={set('customerName')} error={errors.customerName}
        />
        <Field
          label="Email Address" type="email" name="customerEmail"
          hint="We'll confirm what's in the post"
          value={form.customerEmail} onChange={set('customerEmail')} error={errors.customerEmail}
        />
        <Field
          label="Mobile Number" type="tel" name="customerPhone" required={false}
          hint="Optional — but it's how we'd check we've understood what you're after"
          value={form.customerPhone} onChange={set('customerPhone')} error={errors.customerPhone}
        />

        <div>
          <label className="mb-2 flex items-center gap-1 font-data text-eyebrow font-bold uppercase tracking-[0.15em] text-ink-500">
            Postcode <span className="text-ember-700">*</span>
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MapPin aria-hidden="true" className="absolute left-3 top-1/2 z-[1] h-3.5 w-3.5 -translate-y-1/2 text-ink-500" />
              <input
                type="text"
                value={form.postcode}
                onChange={e => set('postcode')(e.target.value.toUpperCase())}
                className={`w-full rounded-sm border-[1.5px] bg-calico-50 py-3 pl-8 pr-4 text-body-sm uppercase text-ink-900 outline-none transition-[border-color] duration-swift ease-out-expo ${
                  errors.postcode ? 'border-rust-700' : 'border-calico-300 focus:border-ember-700'
                }`}
              />
            </div>
            <button
              type="button"
              onClick={findAddress}
              disabled={searching || form.postcode.length < 5}
              className="flex cursor-pointer items-center gap-2 rounded-sm border-0 bg-ink-900 px-4 text-caption font-bold text-calico-50 transition-[background-color,opacity] duration-swift ease-out-expo disabled:cursor-not-allowed disabled:opacity-60"
            >
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Find
            </button>
          </div>
          {errors.postcode && <p className="mt-1 text-caption text-rust-700">{errors.postcode}</p>}
          {confirmed && !errors.postcode && (
            <p className="m-0 mt-2 text-caption font-semibold text-sage-700" aria-live="polite">
              We post free to {confirmed}
            </p>
          )}
        </div>

        {addresses.length > 0 && (
          <Field
            label="Pick your address" name="addressPicker" type="select"
            options={addresses.map(a => ({ value: a, label: a }))}
            value={form.shippingAddress} onChange={set('shippingAddress')}
          />
        )}

        <Field
          label="Full Address" name="shippingAddress" type="textarea"
          value={form.shippingAddress} onChange={set('shippingAddress')} error={errors.shippingAddress}
        />
      </div>

      {serverError && (
        <p className="m-0 mt-4 rounded-sm border border-rust-200 bg-rust-50 px-4 py-3 text-caption text-rust-700">
          {serverError}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || samples.length === 0}
        className={`mt-6 flex h-14 w-full items-center justify-center gap-3 rounded-pill border-0 font-data text-eyebrow font-bold uppercase tracking-[0.1em] transition-[background-color,box-shadow] duration-swift ease-out-expo ${
          pending
            ? 'cursor-wait bg-ink-500 text-calico-50'
            : 'hover-btn btn-ember sheen shadow-ember cursor-pointer bg-ember-500 text-ink-900 disabled:cursor-not-allowed disabled:opacity-50'
        }`}
      >
        {pending
          ? <><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> Sending…</>
          : `Post my ${samples.length === 1 ? 'sample' : 'samples'}`}
      </button>
    </form>
  );
}
