import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import WishlistClient from './WishlistClient'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'My Wishlist | Vantage Group LTD',
  description: 'View and manage your saved luxury sofas and furniture.',
}

export default async function WishlistPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirectTo=/wishlist')
  }

  // Fetch wishlist joined with product and variant data to display images and prices
  const { data: wishlistData, error } = await supabase
    .from('wishlist')
    .select(`
      id,
      product_id,
      products (
        id,
        title,
        slug,
        base_price,
        categories!products_category_id_fkey (
          slug
        ),
        product_variants (
          image_url
        )
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch wishlist items:', error)
  }

  // Flatten and format the relational data for the client component
  const formattedItems = (wishlistData || []).map((item: any) => {
    // Handle potential array returns from Supabase joins
    const product = Array.isArray(item.products) ? item.products[0] : item.products;
    const category = Array.isArray(product?.categories) ? product.categories[0] : product?.categories;
    const variant = Array.isArray(product?.product_variants) ? product.product_variants[0] : product?.product_variants;

    return {
      productId: item.product_id,
      title: product?.title || 'Unavailable Product',
      slug: product?.slug || '',
      categorySlug: category?.slug || 'sofas',
      price: product?.base_price || 0,
      imageUrl: variant?.image_url || '/placeholder.svg'
    }
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 min-h-[60vh]">
      <div className="border-b border-gray-200 pb-5 mb-8">
        <h1 className="text-3xl font-playfair font-bold text-gray-900">My Wishlist</h1>
        <p className="mt-2 text-sm text-gray-500">
          Items you've saved for later. Prices and availability are subject to change.
        </p>
      </div>
      
      <WishlistClient initialItems={formattedItems} />
    </div>
  )
}