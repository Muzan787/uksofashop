// src/app/about/page.tsx
import Image from 'next/image';
import { Shield, Heart, Truck } from 'lucide-react';

export default function AboutPage() {
  return (
    <main className="pb-16">
      {/* Hero Section */}
      <div className="bg-stone-900 text-white py-20 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">About UK Sofa Shop</h1>
        <p className="text-stone-300 max-w-2xl mx-auto text-lg">
          Bringing premium, handcrafted comfort to homes across the United Kingdom.
        </p>
      </div>

      {/* Content Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="relative aspect-square md:aspect-[4/3] rounded-2xl overflow-hidden bg-stone-100">
            <Image 
              src="https://images.pexels.com/photos/1866149/pexels-photo-1866149.jpeg" 
              alt="Crafting furniture" 
              fill 
              className="object-cover"
            />
          </div>
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-stone-900">Our Story</h2>
            <p className="text-stone-600 leading-relaxed">
              Founded with a simple mission: to make luxury furniture accessible without the luxury markup. At UK Sofa Shop, we believe that the heart of every home is the living room, and the soul of the living room is a great sofa.
            </p>
            <p className="text-stone-600 leading-relaxed">
              We source only the finest materials, from rich velvets to durable linens, ensuring every piece not only looks stunning but withstands the test of time. By cutting out the middlemen and expensive showrooms, we pass those savings directly to you.
            </p>
            <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <Heart className="w-8 h-8 text-amber-600 mb-3" />
                <h4 className="font-bold text-stone-900">Crafted with Care</h4>
                <p className="text-sm text-stone-500 mt-1">Every stitch is inspected for perfection.</p>
              </div>
              <div>
                <Shield className="w-8 h-8 text-amber-600 mb-3" />
                <h4 className="font-bold text-stone-900">10-Year Guarantee</h4>
                <p className="text-sm text-stone-500 mt-1">Peace of mind on all frames.</p>
              </div>
              <div>
                <Truck className="w-8 h-8 text-amber-600 mb-3" />
                <h4 className="font-bold text-stone-900">Cash on Delivery</h4>
                <p className="text-sm text-stone-500 mt-1">Pay only when you are satisfied.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}