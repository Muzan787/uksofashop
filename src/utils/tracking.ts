import { sendGAEvent } from '@next/third-parties/google';

// Helper to safely call Meta Pixel
const fbq = (...args: any[]) => {
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq(...args);
  }
};

export const trackAddToCart = (productName: string, price: number) => {
  // 1. Send to Meta
  fbq('track', 'AddToCart', {
    content_name: productName,
    value: price,
    currency: 'GBP', // Change to 'PKR' if billing in Pakistan
  });

  // 2. Send to Google Analytics 4
  sendGAEvent('event', 'add_to_cart', {
    value: price,
    currency: 'GBP',
    items: [{ item_name: productName, price: price }]
  });
};

export const trackPurchase = (orderId: string, totalValue: number) => {
  // 1. Send to Meta
  fbq('track', 'Purchase', {
    value: totalValue,
    currency: 'GBP',
  });

  // 2. Send to Google Analytics 4
  sendGAEvent('event', 'purchase', {
    transaction_id: orderId,
    value: totalValue,
    currency: 'GBP',
  });
};