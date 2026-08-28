'use client';
// src/components/Product/RecentlyViewed.tsx

import { useEffect, useSyncExternalStore } from 'react';
import {
  RECENT_LIMIT,
  recentlyViewedServerSnapshot,
  recentlyViewedSnapshot,
  recordRecentlyViewed,
  subscribeRecentlyViewed,
} from '@/utils/recentlyViewed';
import ProductRow from './ProductRow';

/** The product being looked at: recorded, and kept out of its own row. */
interface Props {
  id: string;
  title: string;
  href: string;
  image: string | null;
  price: number;
}

/**
 * What this visitor has been looking at.
 *
 * The trail is in their browser, so the server cannot know it and does not
 * try: the server snapshot is empty and the row renders nothing at all until
 * the browser has read localStorage. That is the behaviour you want rather
 * than a limitation to work around — a first visit has no history, and a
 * heading over an empty strip is worse than no heading. Nothing is reserved,
 * nothing flashes, and the row is simply not there until there is something to
 * put in it.
 *
 * `transition={false}`: a sofa can legitimately appear in this row AND in the
 * Similar row above it, and a view-transition-name has to be unique in the
 * document or the browser abandons the whole transition. Similar keeps its
 * names; this row gives them up.
 */
export default function RecentlyViewed({ id, title, href, image, price }: Props) {
  const trail = useSyncExternalStore(
    subscribeRecentlyViewed,
    recentlyViewedSnapshot,
    recentlyViewedServerSnapshot,
  );

  // Recording notifies the store, which re-renders this row with the current
  // product at the front — where the filter below immediately removes it.
  // Primitives rather than one object prop, so this does not re-run on every
  // render of the page around it.
  useEffect(() => {
    recordRecentlyViewed({ id, title, href, image, price });
  }, [id, title, href, image, price]);

  const items = trail.filter(p => p.id !== id).slice(0, RECENT_LIMIT);

  return (
    <ProductRow
      eyebrow="Your trail"
      title="Where you have been."
      emphasise="been."
      items={items.map(p => ({
        id: p.id,
        title: p.title,
        href: p.href,
        image: p.image,
        price: p.price,
      }))}
      transition={false}
    />
  );
}
