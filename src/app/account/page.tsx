// src/app/account/page.tsx
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import AccountTabs from './AccountTabs'

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !user.email) {
    redirect('/login')
  }

  const customerEmail = user.email

  // 1. Fetch Orders
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('customer_email', customerEmail)
    .order('created_at', { ascending: false })

  // 2. Fetch Reviews (Join with products for title/slug)
  const { data: reviews } = await supabase
    .from('reviews')
    .select(`
      *,
      product:products(title, slug)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // 3. Fetch Wishlist (Join with products for details)
  const { data: wishlist } = await supabase
    .from('wishlist')
    .select(`
      id,
      product_id,
      product:products(*)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-[#f8f6f2] pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-playfair font-bold text-[#1c1917] mb-8">
          Welcome to your account
        </h1>
        <div className="bg-white rounded-xl border border-[#f0ede8] p-6 shadow-sm mb-8">
          <p className="text-[#57534e]">Logged in as: <span className="font-semibold text-[#1c1917]">{user.email}</span></p>
        </div>

        <AccountTabs 
          orders={orders || []} 
          reviews={reviews || []} 
          wishlist={wishlist || []} 
        />
      </div>
    </div>
  )
} 