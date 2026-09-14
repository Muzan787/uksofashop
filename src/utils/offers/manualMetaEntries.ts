export const MANUAL_META_ENTRIES = [
  { ad: 'A01', slug: 'a01-pay-on-arrival', destination: '/' },
  { ad: 'A02', slug: 'a02-roma-3-2', destination: '/shop/recliner/roma-recliner-manual-3-and-2' },
  {
    ad: 'A03', slug: 'a03-hannah-electric', destination: '/shop/electric-sofa/hannah-electric-corner',
    cards: [
      { slug: 'grey-hannah', destination: '/shop/electric-sofa/hannah-electric-corner' },
      { slug: 'beige-hannah', destination: '/shop/electric-sofa/hannah-electric-corner' },
    ],
  },
  {
    ad: 'A04', slug: 'a04-manual-vs-electric', destination: '/shop/recliner/roma-recliner-manual-3-and-2',
    cards: [
      { slug: 'decision-opener', destination: '/shop/recliner/roma-recliner-manual-3-and-2' },
      { slug: 'roma-manual', destination: '/shop/recliner/roma-recliner-manual-3-and-2' },
      { slug: 'hannah-electric', destination: '/shop/electric-sofa/hannah-electric-corner' },
    ],
  },
  {
    ad: 'A05', slug: 'a05-will-it-fit', destination: '/shop/corner-sofa/verona-high-back-5-seater-corner-2c2',
    cards: [
      { slug: 'fit-question', destination: '/shop/corner-sofa/verona-high-back-5-seater-corner-2c2' },
      { slug: 'measure-route', destination: '/shop/corner-sofa/verona-high-back-5-seater-corner-2c2' },
      { slug: 'verona-product', destination: '/shop/corner-sofa/verona-high-back-5-seater-corner-2c2' },
    ],
  },
  { ad: 'A06', slug: 'a06-lily-u-shape', destination: '/shop/corner-sofa/lily-high-back-armed-u-shape' },
  { ad: 'A07', slug: 'a07-free-mainland-delivery', destination: '/delivery-returns' },
  {
    ad: 'A08', slug: 'a08-lily-custom-choice', destination: '/fabrics',
    cards: [
      { slug: 'lily-beige', destination: '/shop/corner-sofa/lily-high-back-armed-u-shape' },
      { slug: 'lily-cream', destination: '/shop/corner-sofa/lily-high-back-armed-u-shape' },
      { slug: 'custom-options', destination: '/fabrics' },
    ],
  },
  {
    ad: 'A09', slug: 'a09-blackburn-showroom', destination: '/showroom',
    cards: [
      { slug: 'real-exterior', destination: '/showroom' },
      { slug: 'real-team-showroom', destination: '/showroom' },
    ],
  },
  {
    ad: 'A10', slug: 'a10-choose-your-shape', destination: '/shop/3-2-seater',
    cards: [
      { slug: 'roma-3-2', destination: '/shop/recliner/roma-recliner-manual-3-and-2' },
      { slug: 'verona-corner', destination: '/shop/corner-sofa/verona-high-back-5-seater-corner-2c2' },
      { slug: 'lily-u-shape', destination: '/shop/corner-sofa/lily-high-back-armed-u-shape' },
    ],
  },
  { ad: 'A11', slug: 'a11-malibu-3-2', destination: '/shop/3-2-seater/malibu-high-back-3and2-seater' },
  { ad: 'A12', slug: 'a12-nova-electric', destination: '/shop/electric-sofa/nova-electric-recliner-3and2-seater' },
] as const
