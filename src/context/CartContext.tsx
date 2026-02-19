// src/context/CartContext.tsx
'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { CartItem } from '@/app/actions/checkout'

// Extend CartItem to include some display details for the UI
export interface DisplayCartItem extends CartItem {
  title: string
  color: string
  image_url: string
}

interface CartContextType {
  cartItems: DisplayCartItem[]
  addToCart: (item: DisplayCartItem) => void
  removeFromCart: (variantId: string) => void
  clearCart: () => void
  totalAmount: number
  itemCount: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<DisplayCartItem[]>([])

  // Optional: Load cart from LocalStorage on mount so it persists across refreshes
  useEffect(() => {
    const savedCart = localStorage.getItem('uksofashop_cart')
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart))
      } catch (e) {
        console.error('Failed to parse cart')
      }
    }
  }, [])

  // Save to LocalStorage whenever the cart changes
  useEffect(() => {
    localStorage.setItem('uksofashop_cart', JSON.stringify(cartItems))
  }, [cartItems])

  const addToCart = (newItem: DisplayCartItem) => {
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.variant_id === newItem.variant_id)
      if (existingItem) {
        // If it exists, increase quantity
        return prevItems.map((item) =>
          item.variant_id === newItem.variant_id
            ? { ...item, quantity: item.quantity + newItem.quantity }
            : item
        )
      }
      // Otherwise, add as a new item
      return [...prevItems, newItem]
    })
  }

  const removeFromCart = (variantId: string) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.variant_id !== variantId))
  }

  const clearCart = () => setCartItems([])

  const totalAmount = cartItems.reduce((total, item) => total + item.price * item.quantity, 0)
  const itemCount = cartItems.reduce((count, item) => count + item.quantity, 0)

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, clearCart, totalAmount, itemCount }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}