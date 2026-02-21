// src/app/shop/[category]/[slug]/page.tsx
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import VariantSelector from '@/components/Product/VariantSelector'
import ReviewForm from '@/components/Product/ReviewForm'
import { Star } from 'lucide-react'

type Params = Promise<{ slug: string; category: string }>

export async function generateMetadata(props: { params: Params }): Promise<Metadata> {
  const params = await props.params;
  const supabase = await createClient()
  const { data: product } = await supabase
    .from('products')
    .select('title, description')
    .eq('slug', params.slug)
    .single()

  if (!product) return { title: 'Product Not Found' }

  return {
    title: `${product.title} | UK Sofa Shop`,
    description: product.description || `Buy the best ${product.title} at UK Sofa Shop.`,
  }
}

export default async function ProductPage(props: { params: Params }) {
  const params = await props.params;
  const supabase = await createClient()

  // Notice we added the reviews array to the select query
  const { data: product, error } = await supabase
    .from('products')
    .select('*, product_variants (*), reviews (*)')
    .eq('slug', params.slug)
    .single()

  if (error || !product) notFound()

  // Filter so we only show approved reviews to the public
  const approvedReviews = product.reviews?.filter(r => r.status === 'approved') || []

  return (
    <main className="min-h-screen bg-white text-slate-900 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 mt-10">
        
        {/* Top Section: Product Images & Cart Logic */}
        <VariantSelector 
          product={product} 
          variants={product.product_variants || []} 
        />

        {/* Bottom Section: Customer Reviews */}
        <div className="mt-24 border-t border-stone-200 pt-16">
          <h2 className="text-3xl font-bold text-stone-900 mb-10">Customer Reviews</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            {/* Reviews List */}
            <div className="lg:col-span-7 space-y-8">
              {approvedReviews.length > 0 ? (
                approvedReviews.map((review) => (
                  <div key={review.id} className="border-b border-stone-100 pb-8 last:border-0">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-10 h-10 bg-stone-100 rounded-full flex items-center justify-center font-bold text-stone-500">
                        {review.customer_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-stone-900">{review.customer_name}</p>
                        <div className="flex items-center gap-1 text-amber-500 mt-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-3.5 h-3.5 ${i < review.rating ? 'fill-current' : 'text-stone-300'}`} />
                          ))}
                        </div>
                      </div>
                      <span className="ml-auto text-sm text-stone-400">
                        {new Date(review.created_at || '').toLocaleDateString('en-GB')}
                      </span>
                    </div>
                    <p className="text-stone-600 leading-relaxed">{review.comment}</p>
                  </div>
                ))
              ) : (
                <div className="bg-stone-50 p-8 rounded-xl text-center border border-stone-100">
                  <p className="text-stone-500">No reviews yet. Be the first to share your thoughts!</p>
                </div>
              )}
            </div>

            {/* Submit a Review Form */}
            <div className="lg:col-span-5">
              <div className="sticky top-24">
                <ReviewForm productId={product.id} />
              </div>
            </div>

          </div>
        </div>

      </div>
    </main>
  )
}