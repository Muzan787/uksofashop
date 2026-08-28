'use client';
// src/hooks/useCategories.ts

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export interface Category {
  id: string;
  name: string;
  slug: string;
  image_url?: string | null;
}

/**
 * The category list, fetched once per page load and shared.
 *
 * The header and the footer both need it. Fetching in each of them would send
 * the same query twice on every single page, so the in-flight promise is held
 * at module scope and the second caller waits on the first.
 *
 * Deliberately client-side rather than passed down from the server: the layout
 * wrapper that renders both of them is a client component, so a server fetch
 * would mean threading the data through the root layout and making every route
 * wait on a query that only fills navigation.
 */
let inflight: Promise<Category[]> | null = null;

function loadCategories(): Promise<Category[]> {
  if (!inflight) {
    // Supabase's builder is a PromiseLike, not a Promise, so it has no .catch
    // of its own — wrapping it gives one and normalises the type.
    inflight = Promise.resolve(
      createClient().from('categories').select('id,name,slug,image_url').order('name'),
    )
      .then(({ data }) => data ?? [])
      // A failed fetch must not poison the cache — the next caller retries.
      .catch(() => {
        inflight = null;
        return [] as Category[];
      });
  }
  return inflight;
}

export function useCategories(): Category[] {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    let alive = true;
    loadCategories().then((rows) => {
      if (alive) setCategories(rows);
    });
    return () => { alive = false; };
  }, []);

  return categories;
}
