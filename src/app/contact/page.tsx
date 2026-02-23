
'use client'

import { useState } from 'react';
import { Mail, Phone, MapPin, Clock, Loader2, CheckCircle } from 'lucide-react';
import { submitContactForm } from '@/app/actions/contact';

export default function ContactPage() {
  const [isPending, setIsPending] = useState(false);
  const [status, setStatus] = useState<{ error?: string, success?: boolean }>({});

  async function handleAction(formData: FormData) {
    setIsPending(true);
    setStatus({});
    
    const result = await submitContactForm(formData);
    
    if (result.error) {
      setStatus({ error: result.error });
    } else {
      setStatus({ success: true });
      (document.getElementById('contactForm') as HTMLFormElement).reset();
    }
    setIsPending(false);
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* ... keeping the top header and contact info exactly the same ... */}
      
        {/* Contact Form UI */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-stone-200">
          <h2 className="text-2xl font-bold text-stone-900 mb-6">Send us a Message</h2>
          
          {status.success && (
            <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5" /> Message sent successfully! We will get back to you soon.
            </div>
          )}
          {status.error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">
              {status.error}
            </div>
          )}

          <form id="contactForm" action={handleAction} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">First Name</label>
                <input type="text" name="firstName" required className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-600 outline-none" placeholder="John" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Last Name</label>
                <input type="text" name="lastName" className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-600 outline-none" placeholder="Doe" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Email Address</label>
              <input type="email" name="email" required className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-600 outline-none" placeholder="john@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Order Number (Optional)</label>
              <input type="text" name="orderNumber" className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-600 outline-none" placeholder="#12345" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Message</label>
              <textarea name="message" required rows={4} className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-600 outline-none" placeholder="How can we help you?"></textarea>
            </div>
            <button type="submit" disabled={isPending} className="w-full bg-stone-900 text-white py-3.5 rounded-xl font-bold hover:bg-stone-800 transition flex justify-center items-center gap-2 disabled:opacity-70">
              {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Message'}
            </button>
          </form>
        </div>
    </main>
  );
}