// src/utils/orderItemTitle.ts
//
// What the line is called.
//
// Usually the catalogue product's title. But a WhatsApp order may be for
// something built to order that the catalogue does not name - a corner cut to
// a room, a frame copied from a photo - and the line then carries a name
// typed when the order was taken. Where there is one it wins outright: the
// variant behind it was chosen to price the line, not to describe it, and
// printing both would read as two different sofas.
//
// One function so the admin card, the invoice, the copy-to-WhatsApp block and
// the edit form cannot disagree. The customer-facing pages get the same answer
// from the database - track_order and order_for_confirmation already coalesce
// the two - so nothing there has to know this field exists.

interface TitleSource {
  custom_title?: string | null
  product_variants?: { products?: { title?: string | null } | null } | null
}

export function itemTitle(item: TitleSource, fallback = 'Item'): string {
  return (
    item.custom_title?.trim() ||
    item.product_variants?.products?.title?.trim() ||
    fallback
  )
}
