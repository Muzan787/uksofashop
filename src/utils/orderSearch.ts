// src/utils/orderSearch.ts
//
// The orders list's search box (admin upgrade D3). The database search
// (private.search_orders) cleans its input too; this is the first of the two
// layers, so nothing but plain characters ever leaves the page.

/** What reaches the search: letters, digits, spaces and . @ _ + - only. */
export function cleanSearch(raw: string | null | undefined): string {
  return (raw ?? '').replace(/[^A-Za-z0-9@._+ -]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80)
}

/** An order code (its first 8 characters) or a full order id. */
export function isOrderCode(q: string): boolean {
  return /^(?:[0-9a-f]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(q)
}
