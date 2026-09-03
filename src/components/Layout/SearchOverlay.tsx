'use client';
// src/components/Layout/SearchOverlay.tsx

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { X, Clock, ArrowUpRight } from 'lucide-react';
import { searchProducts } from '@/app/actions/navigation';
import { STAGGER_STEP, STAGGER_CAP } from '@/components/Motion/tokens';
import { blurDataURL } from '@/utils/cloudinary'

interface Category { id: string; name: string; slug: string }

interface Hit {
  id: string;
  title: string;
  slug: string;
  base_price: number;
  image: string | null;
  categorySlug: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  /** Focus returns here on close. */
  triggerRef: React.RefObject<HTMLElement | null>;
}

const RECENTS_KEY = 'uks-recent-searches';
const RECENTS_MAX = 5;
const DEBOUNCE_MS = 250;
const MIN_CHARS = 2;

function readRecents(): string[] {
  // Private-mode Safari throws on access rather than returning null.
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === 'string').slice(0, RECENTS_MAX) : [];
  } catch {
    return [];
  }
}

function rememberSearch(term: string) {
  const clean = term.trim();
  if (clean.length < MIN_CHARS) return;
  try {
    const next = [clean, ...readRecents().filter((s) => s.toLowerCase() !== clean.toLowerCase())].slice(0, RECENTS_MAX);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable — recents are a convenience, never a requirement */
  }
}

export default function SearchOverlay({ open, onClose, categories, triggerRef }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(-1);
  const [recents, setRecents] = useState<string[]>([]);

  /**
   * Results are stored WITH the term that produced them, so both the visible
   * hits and the "searching" state can be derived rather than tracked. Held
   * separately they had to be cleared from an effect on every keystroke, which
   * is a render cascade and reads back as a flash of stale results.
   */
  const [result, setResult] = useState<{ term: string; hits: Hit[] }>({ term: '', hits: [] });

  // Reset on open, adjusted during render rather than in an effect — the
  // recents list has to be right on the first painted frame, not one after it.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    setHighlight(-1);
    setQuery('');
    // Safe during SSR: readRecents() catches the missing localStorage and
    // returns an empty list, and the overlay is closed on the first render
    // anyway, so this branch does not run until the client is live.
    if (open) setRecents(readRecents());
  }

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, [open]);

  const close = useCallback(() => {
    onClose();
    triggerRef.current?.focus();
  }, [onClose, triggerRef]);

  // Debounced live search. The timer is cleared on every keystroke, so a fast
  // typist issues one query rather than one per character.
  useEffect(() => {
    if (!open) return;
    const term = query.trim();
    if (term.length < MIN_CHARS) return;

    let cancelled = false;

    const timer = setTimeout(async () => {
      // The row shaping and the term sanitising both moved into the action -
      // the old version interpolated the raw term straight into a PostgREST
      // `or=` filter, where a comma or a bracket silently corrupted the query.
      const hits = await searchProducts(term).catch(() => []);

      if (cancelled) return;

      setResult({ term, hits });
      setHighlight(-1);
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, open]);

  const goTo = useCallback(
    (hit: Hit) => {
      rememberSearch(query);
      onClose();
      router.push(`/shop/${hit.categorySlug}/${hit.slug}`);
    },
    [query, onClose, router],
  );

  const submit = useCallback(() => {
    const term = query.trim();
    if (!term) return;
    rememberSearch(term);
    onClose();
    router.push(`/search?q=${encodeURIComponent(term)}`);
  }, [query, onClose, router]);

  /**
   * Keyboard handling lives on the input rather than the document, so the
   * arrow keys only steer results while the caret is actually in the field.
   */
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => (hits.length === 0 ? -1 : (h + 1) % hits.length));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => (hits.length === 0 ? -1 : (h <= 0 ? hits.length : h) - 1));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (highlight >= 0 && hits[highlight]) goTo(hits[highlight]);
      else submit();
    }
  };

  const money = (n: number) => `£${Math.round(n).toLocaleString('en-GB')}`;
  const term = query.trim();
  const showSuggestions = term.length < MIN_CHARS;
  // Derived from the stored term, so a result from the previous keystroke can
  // never render against the current one.
  const hits = result.term === term ? result.hits : [];
  const searching = !showSuggestions && result.term !== term;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search"
      className={`fixed inset-0 z-drawer overflow-hidden ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
      aria-hidden={!open}
    >
      {/* The curtain. The panel descends over the page rather than fading in
          on top of it — the same clipper-and-translate the mega menu uses, so
          the two overlays read as one family. */}
      <div
        data-ground="dark"
        className={`grad-ink grain relative isolate h-full w-full overflow-hidden bg-ink-900 transition-transform duration-base ease-in-out-quart ${
          open ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        {/* The same lighting as every other dark surface on the site. */}
        <div aria-hidden="true" className="aurora">
          <span className="aurora__warm" />
          <span className="aurora__deep" />
        </div>

        <span
          aria-hidden="true"
          className="relative block h-0.5"
          style={{ backgroundImage: 'var(--grad-rule)' }}
        />

        <button
          type="button"
          onClick={close}
          aria-label="Close search"
          className="hover-icon-dark glass-dark-panel absolute right-4 top-5 z-raised grid h-11 w-11 place-items-center rounded-pill text-calico-50"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <div data-lenis-prevent className="relative mx-auto h-full max-w-[680px] overflow-y-auto px-5 pb-16 pt-20 sm:pt-28">
          {/* ── The field ── one line, no box, no icon inside it ──────────── */}
          <label htmlFor="site-search" className="eyebrow mb-4 flex items-center gap-2.5 text-ember-300">
            <span aria-hidden="true" className="block h-px w-5 bg-ember-500" />
            Search
          </label>
          <div className="relative">
            <input
              id="site-search"
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Corner sofas, velvet, recliners…"
              autoComplete="off"
              role="combobox"
              aria-expanded={hits.length > 0}
              aria-controls="search-results"
              aria-autocomplete="list"
              className="focus-ring-inset w-full appearance-none rounded-sm border-0 bg-transparent pb-3 font-display text-[32px] font-semibold leading-tight text-calico-50 placeholder:text-calico-50/30 [&::-webkit-search-cancel-button]:hidden"
            />
            <span aria-hidden="true" className="block h-px w-full" style={{ backgroundImage: 'var(--grad-rule)' }} />
          </div>

          {/* ── Nothing typed yet: recents, then popular categories ───────── */}
          {showSuggestions && (
            <div className="mt-10 flex flex-col gap-10">
              {recents.length > 0 && (
                <div>
                  <p className="eyebrow mb-4 text-calico-300">Recent</p>
                  <ul className="m-0 flex list-none flex-col gap-1 p-0">
                    {recents.map((r) => (
                      <li key={r}>
                        <button
                          type="button"
                          onClick={() => setQuery(r)}
                          className="hover-icon-dark flex min-h-11 w-full items-center gap-3 rounded-sm px-2 text-left text-body text-calico-50"
                        >
                          <Clock aria-hidden="true" className="h-4 w-4 shrink-0 text-ember-300" />
                          {r}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {categories.length > 0 && (
                <div>
                  <p className="eyebrow mb-4 text-calico-300">Popular</p>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <Link
                        key={cat.id}
                        href={`/shop/${cat.slug}`}
                        onClick={onClose}
                        className="glass-dark-panel hover-btn hover-btn-dark rounded-pill px-4 py-2.5 text-body-sm text-calico-300 no-underline"
                      >
                        {cat.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Live results ──────────────────────────────────────────────── */}
          {!showSuggestions && (
            <div className="mt-8">
              <p aria-live="polite" className="eyebrow mb-4 text-calico-300">
                {searching ? 'Searching…' : hits.length > 0 ? `${hits.length} match${hits.length === 1 ? '' : 'es'}` : 'No matches'}
              </p>

              <ul id="search-results" role="listbox" aria-label="Search results" className="m-0 flex list-none flex-col p-0">
                {hits.map((hit, i) => (
                  <li key={hit.id} role="option" aria-selected={highlight === i}>
                    <button
                      type="button"
                      onClick={() => goTo(hit)}
                      onPointerEnter={() => setHighlight(i)}
                      className={`flex w-full items-center gap-4 rounded-sm border-b border-calico-50/10 p-3 text-left transition-[opacity,transform,background-color] duration-base ease-out-expo ${
                        highlight === i ? 'bg-calico-50/10' : 'bg-transparent'
                      } ${open ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}
                      style={{ transitionDelay: `${Math.min(i, STAGGER_CAP - 1) * STAGGER_STEP * 1000}ms` }}
                    >
                      <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-calico-50/10">
                        {hit.image && (
                          <Image src={hit.image} alt="" fill sizes="56px" className="object-cover"
            placeholder="blur"
            blurDataURL={blurDataURL(hit.image)}
           />
                        )}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-body font-semibold text-calico-50">
                        {hit.title}
                      </span>
                      <span className="shrink-0 font-data text-data tabular-nums text-ember-300">
                        {money(hit.base_price)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>

              {!searching && (
                <button
                  type="button"
                  onClick={submit}
                  className="hover-link mt-6 inline-flex items-center gap-2 text-body-sm text-calico-300"
                >
                  See all results for “{term}”
                  <ArrowUpRight aria-hidden="true" className="h-4 w-4 text-ember-300" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
