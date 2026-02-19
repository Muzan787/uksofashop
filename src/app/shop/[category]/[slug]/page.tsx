import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import VariantSelector from '@/components/Product/VariantSelector'

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

  const { data: product, error } = await supabase
    .from('products')
    .select('*, product_variants (*), reviews (*)')
    .eq('slug', params.slug)
    .single()

  if (error || !product) notFound()

  return (
    <main className="min-h-screen bg-white text-slate-900 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 mt-10">
        <VariantSelector 
          product={product} 
          variants={product.product_variants || []} 
        />
      </div>
    </main>
  )
}