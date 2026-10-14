// src/utils/adminStatus.ts
//
// The words the admin uses for an order's status. The database values never
// change (pending_cod, shipped, …); only what the screen says does. The admin
// used to print the raw value - "pending cod", "shipped" - beside labels of
// its own ("Pending", "In transit"), so one order had three names.
//
// Customers see their own wording (utils/orderStatus.ts): "Order received",
// "Being prepared", "Out for delivery". These are the staff's words for the
// same steps.

export const ADMIN_STATUS_LABEL: Record<string, string> = {
  pending_cod: 'Waiting to confirm',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'On its way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

/** The admin's word for a status; an unknown value is shown as it is. */
export function adminStatusLabel(status: string | null | undefined): string {
  const key = status ?? 'pending_cod'
  return ADMIN_STATUS_LABEL[key] ?? key.replace(/_/g, ' ')
}
