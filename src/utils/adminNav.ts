// src/utils/adminNav.ts
//
// The admin's sections, and which one is "current" for a given address.
// One list drives the desktop sidebar, the phone's bottom bar and the More
// page, so a section added here appears in all three.
//
// Phones get five tabs (plan decision 1): Home, Orders, Leads, Catalogue and
// More. Everything else lives behind More, and More stays highlighted while
// you are on any of those sections - otherwise the bar would show nothing
// selected and you would lose your place.

export type AdminSectionKey =
  | 'home' | 'orders' | 'meta' | 'google' | 'leads' | 'journeys'
  | 'catalogue' | 'inventory' | 'categories' | 'reviews' | 'videos' | 'status' | 'settings' | 'adlinks'

export interface AdminSection {
  key: AdminSectionKey
  href: string
  label: string
}

/**
 * Every section, in the desktop sidebar's order. No URL here ever moves.
 * Swatches became the Samples tab on Leads (admin upgrade I1); its address
 * still works and opens that tab.
 */
export const ADMIN_SECTIONS: AdminSection[] = [
  { key: 'home',       href: '/admin',            label: 'Home' },
  { key: 'orders',     href: '/admin/orders',     label: 'Orders' },
  { key: 'meta',       href: '/admin/meta',       label: 'Meta' },
  { key: 'google',     href: '/admin/google',     label: 'Google' },
  { key: 'leads',      href: '/admin/leads',      label: 'Leads' },
  { key: 'journeys',   href: '/admin/journeys',   label: 'Journeys' },
  { key: 'catalogue',  href: '/admin/catalogue',  label: 'Catalogue' },
  { key: 'inventory',  href: '/admin/inventory',  label: 'Products' },
  { key: 'categories', href: '/admin/categories', label: 'Categories' },
  { key: 'reviews',    href: '/admin/reviews',    label: 'Reviews' },
  { key: 'videos',     href: '/admin/videos',     label: 'Videos' },
  { key: 'status',     href: '/admin/status',     label: 'Status' },
  { key: 'settings',   href: '/admin/settings',   label: 'Settings' },
  { key: 'adlinks',    href: '/admin/ad-links',   label: 'Ad links' },
]

export type PhoneTabKey = 'home' | 'orders' | 'leads' | 'catalogue' | 'more'

export interface PhoneTab {
  key: PhoneTabKey
  href: string
  label: string
}

/**
 * The phone's bottom bar. Catalogue opens the catalogue hub (admin upgrade
 * Phase 9), and stays lit on products and categories too.
 */
export const PHONE_TABS: PhoneTab[] = [
  { key: 'home',      href: '/admin',           label: 'Home' },
  { key: 'orders',    href: '/admin/orders',    label: 'Orders' },
  { key: 'leads',     href: '/admin/leads',     label: 'Leads' },
  { key: 'catalogue', href: '/admin/catalogue', label: 'Catalogue' },
  { key: 'more',      href: '/admin/more',      label: 'More' },
]

export const MORE_HREF = '/admin/more'

/** The sections reached through More on a phone, in the More page's order. */
export const MORE_SECTION_KEYS: AdminSectionKey[] = [
  'meta', 'google', 'journeys', 'reviews', 'videos', 'status', 'settings', 'adlinks',
]

/** The sections the phone's Catalogue tab covers: the hub, products and categories. */
export const CATALOGUE_SECTION_KEYS: AdminSectionKey[] = ['catalogue', 'inventory', 'categories']

/** True when `pathname` is `href` or somewhere beneath it. Home matches only itself. */
export function sectionActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin'
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** Which bottom-bar tab is current for this address, if any. */
export function activePhoneTab(pathname: string): PhoneTabKey | null {
  if (sectionActive(pathname, MORE_HREF)) return 'more'
  const moreHrefs = ADMIN_SECTIONS.filter(s => MORE_SECTION_KEYS.includes(s.key)).map(s => s.href)
  if (moreHrefs.some(href => sectionActive(pathname, href))) return 'more'
  const catalogueHrefs = ADMIN_SECTIONS.filter(s => CATALOGUE_SECTION_KEYS.includes(s.key)).map(s => s.href)
  if (catalogueHrefs.some(href => sectionActive(pathname, href))) return 'catalogue'
  const tab = PHONE_TABS.find(t => t.key !== 'more' && sectionActive(pathname, t.href))
  return tab?.key ?? null
}
