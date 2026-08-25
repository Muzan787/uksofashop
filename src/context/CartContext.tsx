// src/context/CartContext.tsx
'use client'

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
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
   * Read synchronously on the first render rather than in an effect.
   *
   * The old shape was two effects: one that loaded from localStorage, one that
   * saved on every change. Between the first render and the load effect
   * committing, the save effect fired with the initial empty array and wrote
   * `[]` over a real stored cart - so closing the tab in that window emptied
   * the basket. Doing the read in the initialiser removes the window entirely,
   * and the guard below stops the save running before a load has happened.
   *
   * The function form only runs once, and it is guarded for the server render
   * where localStorage does not exist.
   */
  const [cartItems, setCartItems] = useState<DisplayCartItem[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const saved = window.localStorage.getItem('uksofashop_cart')
      return saved ? (JSON.parse(saved) as DisplayCartItem[]) : []
    } catch {
      return []
    }
  })

  // Skips the very first run. On the server render the state starts empty
  // regardless of what is stored, and writing that back on hydration would
  // reintroduce the bug the initialiser above just removed.
  const hasLoaded = useRef(false)
  useEffect(() => {
    if (!hasLoaded.current) {
      hasLoaded.current = true
      return
    }
    localStorage.setItem('uksofashop_cart', JSON.stringify(cartItems))
  }, [cartItems])

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