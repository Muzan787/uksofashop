/** Owner-confirmed supply constraint; catalogue stock quantities are placeholders. */
export const ROMA_DELIVERY_NOTICE = 'High-demand item — please allow approximately 10–14 days for delivery of Roma models. We’ll confirm availability and delivery timing with you before dispatch.';

export const ROMA_CART_NOTICE = 'Your cart includes a Roma model. Please allow approximately 10–14 days for delivery; we’ll confirm availability and timing before dispatch.';

export function isRomaProduct(title: string): boolean {
  return /\broma\b/i.test(title);
}
