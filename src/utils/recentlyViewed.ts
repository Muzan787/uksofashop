// src/utils/recentlyViewed.ts
//
// A short trail of what someone has looked at, kept in their own browser.
//
// Deliberately localStorage rather than a table: it needs no account, it works
// for the guest checkout this shop is built around, and it never leaves the
// device — so there is nothing here to disclose, export or delete on request.
//
// Exposed as an external store rather than as a plain read, so a component can
// subscribe to it with useSyncExternalStore instead of reading it into state
// inside an effect. That is not ceremony: localStorage genuinely is external
// state, and the hook is what lets the server render an empty trail and the
// browser fill it in without a hydration mismatch or a cascading render.

export interface RecentProduct {
  id: string;
  title: string;
  href: string;
  image: string | null;
  price: number;
  /** When it was last looked at. Sorting key, and nothing else. */
  at: number;
}

const KEY = 'uksofashop:recently-viewed';

/** How many the row shows. */
export const RECENT_LIMIT = 8;

/**
 * One more than the row shows.
 *
 * The product you are on is recorded too, and then filtered out of its own
 * row. Storing exactly eight would therefore leave seven; storing nine means
 * the row is full whenever there is enough history to fill it.
 */
const STORE_LIMIT = RECENT_LIMIT + 1;

/** A stable identity for "nothing", so snapshots can be compared by reference. */
const EMPTY: RecentProduct[] = [];

let cachedRaw: string | null = null;
let cachedList: RecentProduct[] = EMPTY;

const listeners = new Set<() => void>();

/**
 * Anything in localStorage is user-writable and may be left over from an older
 * shape of this record, so every field is checked before it is used.
 */
function parse(raw: string | null): RecentProduct[] {
  if (!raw) return EMPTY;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;

    const clean = parsed
      .filter((p): p is RecentProduct =>
        Boolean(p) &&
        typeof p === 'object' &&
        typeof (p as RecentProduct).id === 'string' &&
        typeof (p as RecentProduct).title === 'string' &&
        typeof (p as RecentProduct).href === 'string' &&
        // Only ever an internal path. A stored absolute URL would be a link
        // this site renders to somewhere it does not control.
        (p as RecentProduct).href.startsWith('/') &&
        typeof (p as RecentProduct).price === 'number' &&
        Number.isFinite((p as RecentProduct).price))
      .sort((a, b) => (b.at ?? 0) - (a.at ?? 0))
      .slice(0, STORE_LIMIT);

    return clean.length ? clean : EMPTY;
  } catch {
    return EMPTY;
  }
}

/**
 * The current trail.
 *
 * Memoised on the raw string: useSyncExternalStore compares snapshots by
 * reference and would loop forever on a freshly parsed array every call.
 *
 * Reading localStorage THROWS rather than returning null in a few real
 * situations — Safari private browsing, a browser set to block site data, a
 * partitioned third-party context — so the whole thing is guarded. A product
 * page must not fall over because of a convenience feature.
 */
export function recentlyViewedSnapshot(): RecentProduct[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === cachedRaw) return cachedList;
    cachedRaw = raw;
    cachedList = parse(raw);
    return cachedList;
  } catch {
    return EMPTY;
  }
}

/** The server has no browser storage to read, and says so with a stable value. */
export function recentlyViewedServerSnapshot(): RecentProduct[] {
  return EMPTY;
}

export function subscribeRecentlyViewed(onChange: () => void): () => void {
  listeners.add(onChange);
  // `storage` fires in OTHER tabs only, which is exactly what it is for here:
  // browse in one tab, and this row is current in the other.
  window.addEventListener('storage', onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onChange);
  };
}

/** Records a product as just-viewed, moving it to the front if already there. */
export function recordRecentlyViewed(product: Omit<RecentProduct, 'at'>): void {
  try {
    const next = [
      { ...product, at: Date.now() },
      ...recentlyViewedSnapshot().filter(p => p.id !== product.id),
    ].slice(0, STORE_LIMIT);

    window.localStorage.setItem(KEY, JSON.stringify(next));
    // localStorage does not notify the tab that wrote it.
    for (const listener of listeners) listener();
  } catch {
    // Storage full, blocked or unavailable. Nothing on the page depends on it.
  }
}
