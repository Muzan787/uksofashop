'use client';
// src/components/Layout/WhatsAppFab.tsx

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useWhatsAppCTA } from '@/utils/attribution/useWhatsAppCTA';

/**
 * Height of whatever full-width bar is currently pinned to the same edge -
 * the product page's add-to-cart bar, the checkout total bar - so this
 * button can be pushed up clear of it rather than hidden.
 *
 * REPOSITION, NEVER HIDE. An earlier version of this button stood down
 * entirely while one of those bars was up, on the reasoning that a green
 * pill hovering over "Add to basket" competes with the one action the page
 * exists to get. That is still true, but the acquisition CTA now has to be
 * visible at every scroll position and on every page without exception - so
 * the fix is to give it somewhere else to stand rather than to remove it.
 *
 * Two tests, because a bar can be inactive in two different ways:
 *
 *   ITS RECTANGLE, not its computed `display`. Both bars are hidden by a
 *   breakpoint - the add-to-cart bar is `md:hidden` on itself, but the
 *   checkout bar sits inside an `lg:hidden` wrapper. Computed style is
 *   resolved per element, so a bar whose PARENT is display:none still reports
 *   `display: block` for itself; a rectangle collapses to 0x0 anywhere in a
 *   hidden subtree, however far up it starts.
 *
 *   `inert`, because the add-to-cart bar does not unmount when it is down -
 *   it translates off the bottom of the screen and marks itself inert, which
 *   is the same signal a keyboard uses to skip it.
 */
function coveringBarHeight(): number {
  const bars = document.querySelectorAll<HTMLElement>('[data-bottom-bar]');
  let tallest = 0;
  for (const bar of bars) {
    if (bar.hasAttribute('inert')) continue;
    const rect = bar.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    tallest = Math.max(tallest, rect.height);
  }
  return tallest;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  THE WHATSAPP BUTTON
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Mounted once in MainLayoutWrapper (suppressed in /admin there), so it is on
 * every storefront page. Visible immediately on mount - no scroll threshold,
 * no delayed entrance, no viewport-section logic - because it is an
 * acquisition control, not a decoration: a visitor who wants to ask a
 * question before reading a word should be able to.
 *
 * ICON + WORD, ALWAYS. A round icon-only pill photographs well but tells a
 * first-time visitor nothing; the label reads "WhatsApp" permanently rather
 * than expanding on hover, because hover has no equivalent on a touch device
 * and a mobile visitor was previously left to guess what a green circle was
 * for.
 *
 * CONTRAST. Calico 50 on WhatsApp green is 2.15:1 - it does not pass for text
 * at any size. It carries Ink 900, which is 9.4:1 on the flat green and about
 * 7.6:1 against the darkest stop of the gradient - the same rule the palette
 * already applies to Ember: a saturated mid-tone fill is a LIGHT surface and
 * takes dark type, whatever the brand's own marketing does with it.
 *
 * POSITION. `.fab-offset` (globals.css) clears the bottom navigation and the
 * safe-area inset on mobile, and drops to a plain 24px edge inset at the `lg`
 * breakpoint where there is no bottom navigation to clear - both as a single
 * CSS rule, because the mobile figure is a calc() no Tailwind utility can
 * express. `--fab-extra`, set below, adds the height of any covering bar on
 * top of that.
 *
 * STACKING. z-sticky-bar (30): below the bottom navigation (40, so this never
 * sits over the primary nav), below the cookie-consent banner (60, so a
 * visitor resolves consent before anything else claims that corner) and well
 * below any drawer or modal (70/80).
 */
interface ProductWhatsAppContext {
  productId?: string;
  variantId?: string;
  productName: string;
}

export default function WhatsAppFab() {
  const pathname = usePathname();
  const routeIsSupport = Boolean(
    pathname?.startsWith('/confirm-order/') ||
    pathname?.startsWith('/track-order') ||
    pathname?.startsWith('/account')
  );
  const [checkoutHasOrder, setCheckoutHasOrder] = useState(false);
  const [productContext, setProductContext] = useState<ProductWhatsAppContext | null>(null);
  const supportOnly = routeIsSupport || checkoutHasOrder;

  const cta = useWhatsAppCTA({
    message: supportOnly
      ? 'Hi, I need some help with an existing order or account.'
      : productContext
        ? `Hi, I'm enquiring about this product: ${productContext.productName}.`
        : 'Hi, I’d like some help with a sofa enquiry.',
    pageContext: supportOnly
      ? 'whatsapp_fab_support'
      : productContext
        ? 'whatsapp_fab_product'
        : 'whatsapp_fab',
    productId: supportOnly ? undefined : productContext?.productId,
    variantId: supportOnly ? undefined : productContext?.variantId,
    productName: supportOnly ? undefined : productContext?.productName,
    acquisition: !supportOnly,
  });
  const [extra, setExtra] = useState(0);
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    // Checkout keeps the same pathname after a successful order, so route
    // matching alone cannot tell acquisition from post-purchase support.
    // SuccessStep marks the DOM while it is mounted; observe that marker and
    // switch this always-visible FAB to support-only semantics without hiding it.
    //
    // ProductPageClient also exposes the currently selected product/variant on
    // a hidden DOM marker. Reading it here keeps the site-wide fixed FAB product
    // aware without making the root layout fetch product data a second time.
    const evaluateContext = () => {
      setCheckoutHasOrder(Boolean(document.querySelector('[data-existing-order-context]')));

      const marker = document.querySelector<HTMLElement>('[data-whatsapp-product-context]');
      const productName = marker?.dataset.productName?.trim();
      if (!marker || !productName) {
        setProductContext(null);
        return;
      }

      setProductContext({
        productId: marker.dataset.productId || undefined,
        variantId: marker.dataset.variantId || undefined,
        productName,
      });
    };

    evaluateContext();
    const observer = new MutationObserver(evaluateContext);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    return () => observer.disconnect();
  }, [pathname]);

  useEffect(() => {
    const evaluate = () => setExtra(coveringBarHeight());

    evaluate();
    window.addEventListener('scroll', evaluate, { passive: true });
    // A resize can cross the breakpoint where a bar stops being display:none.
    window.addEventListener('resize', evaluate);
    return () => {
      window.removeEventListener('scroll', evaluate);
      window.removeEventListener('resize', evaluate);
    };
  }, []);

  return (
    <a
      ref={ref}
      href={cta.href}
      onClick={cta.onClick}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      style={extra > 0 ? ({ '--fab-extra': `${extra + 12}px` } as React.CSSProperties) : undefined}
      className="hover-btn btn-whatsapp shadow-whatsapp fab-offset fixed right-4 z-sticky-bar flex h-12 items-center gap-2 rounded-pill bg-whatsapp px-4 text-ink-900 no-underline transition-[bottom] duration-base ease-out-expo focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 shrink-0 fill-current">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>

      <span className="whitespace-nowrap text-body-sm font-semibold">WhatsApp</span>
    </a>
  );
}
