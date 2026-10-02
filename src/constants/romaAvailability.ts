/** Owner-confirmed supply constraint; catalogue stock quantities are placeholders. */
export const ROMA_DELIVERY_NOTICE = 'High-demand item — delivery timing for Roma models can vary by around 10–14 days. We’ll confirm availability and delivery timing with you before dispatch.';

export const ROMA_CART_NOTICE = 'Your cart includes Roma. Delivery timing can vary by around 10–14 days; we’ll confirm availability and timing before dispatch.';

export function isRomaProduct(title: string): boolean {
  return /\broma\b/i.test(title);
}
