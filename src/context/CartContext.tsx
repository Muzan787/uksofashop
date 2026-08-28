// src/context/CartContext.tsx
'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { CartItem } from '@/app/actions/checkout'

export interface DisplayCartItem extends CartItem {
  /**
   * Display only. This is what the price was when the item went into the cart,
   * used to render the basket and the running total. It is deliberately NOT
   * sent to placeOrder - the database re-prices every line from
   * products.base_price + product_variants.price_adjustment at checkout, and
   * rejects the order if its figure disagrees with the one shown here.
   */
  price: number
  title: string
  color: string
  image_url: string
}

interface CartContextType {
  cartItems: DisplayCartItem[]
  addToCart: (item: DisplayCartItem) => void
  removeFromCart: (variantId: string) => void
  updateQuantity: (variantId: string, qty: number) => void
  clearCart: () => void
  totalAmount: number
  itemCount: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  /**
   * THE CART STARTS EMPTY ON BOTH SIDES, AND IS LOADED AFTER MOUNT.
   *
   * This has been through two shapes and both were wrong in opposite ways.
   *
   * It began as two effects — one loading from localStorage, one saving on
   * every change. Between the first render and the load effect committing, the
   * save effect fired with the initial empty array and wrote `[]` over a real
   * stored cart, so closing the tab in that window emptied the basket.
   *
   * The fix for that read localStorage synchronously in the state initialiser.
   * It removed the window, and introduced a hydration mismatch on every page of
   * the site: the server has no localStorage and renders an empty cart, while
   * the client's FIRST render already has the stored one. Anyone with something
   * in their basket got "server rendered HTML didn't match the client", React
   * discarded the tree and re-rendered everything, and the page rendered wrong
   * on the way through. The header badge, the mobile menu's "Cart (n)" and the
   * checkout total all differed between the two renders.
   *
   * So: start empty, which is exactly what the server sends, and load one
   * commit later. The mismatch cannot happen because the first client render is
   * identical to the server's by construction.
   *
   * `loaded` is STATE, not a ref, and that is the part that keeps the original
   * bug from coming back. A ref would already be true by the time the save
   * effect ran in the same commit, so the save would fire with the still-empty
   * array and overwrite the stored cart — the exact failure this started with.
   * As state it forces a second render, and the save below only ever runs on
   * that render, by which point `cartItems` holds what was loaded.
   */
  const [cartItems, setCartItems] = useState<DisplayCartItem[]>([])
  const [loaded, setLoaded] = useState(false)

  /* eslint-disable react-hooks/set-state-in-effect --
   * The rule is right in general and wrong for this case, which is the one it
   * names as legitimate: reading initial state out of an external system the
   * server cannot see. localStorage is that system. There is nowhere else this
   * read can go — in the initialiser it breaks hydration, and during render it
   * is a side effect. usePointerFine, PageFade and CountUp all sit here for the
   * same reason.
   */
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('uksofashop_cart')
      if (saved) setCartItems(JSON.parse(saved) as DisplayCartItem[])
    } catch {
      // A corrupt or unreadable basket is an empty one, not a crash.
    }
    setLoaded(true)
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!loaded) return
    localStorage.setItem('uksofashop_cart', JSON.stringify(cartItems))
  }, [cartItems, loaded])

  /**
   * No analytics call in here. It previously sat after `return [...prev, newItem]`
   * inside this updater, so it was unreachable and never fired once - and the
   * existing-item branch returned even earlier.
   *
   * Moving it up to the caller rather than just above the return is deliberate:
   * a setState updater must stay a pure function of `prev`. React invokes it
   * twice under StrictMode, and may replay it, so a side effect placed here
   * would double-count every add. AddToCart is fired from the click handler in
   * ProductPageClient instead, where it runs exactly once per click.
   */
  const addToCart = (newItem: DisplayCartItem) => {
    setCartItems(prev => {
      const existing = prev.find(i => i.variant_id === newItem.variant_id)
      if (existing) {
        return prev.map(i =>
          i.variant_id === newItem.variant_id
            ? { ...i, quantity: i.quantity + newItem.quantity }
            : i
        )
      }
      return [...prev, newItem]
    })
  }

  const removeFromCart = (variantId: string) =>
    setCartItems(prev => prev.filter(i => i.variant_id !== variantId))

  const updateQuantity = (variantId: string, qty: number) => {
    if (qty < 1) { removeFromCart(variantId); return }
    setCartItems(prev =>
      prev.map(i => i.variant_id === variantId ? { ...i, quantity: qty } : i)
    )
  }

  const clearCart = () => setCartItems([])

  const totalAmount = cartItems.reduce((t, i) => t + i.price * i.quantity, 0)
  const itemCount   = cartItems.reduce((t, i) => t + i.quantity, 0)

  return (
    <CartContext.Provider value={{
      cartItems, addToCart, removeFromCart, updateQuantity,
      clearCart, totalAmount, itemCount,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within a CartProvider')
  return ctx
}