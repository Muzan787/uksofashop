// src/context/CartContext.tsx
'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { CartItem } from '@/app/actions/checkout'

export interface DisplayCartItem extends CartItem {
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
  const [cartItems, setCartItems] = useState<DisplayCartItem[]>([])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('uksofashop_cart')
      if (saved) setCartItems(JSON.parse(saved))
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    localStorage.setItem('uksofashop_cart', JSON.stringify(cartItems))
  }, [cartItems])

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