// src/app/contact/page.tsx
import { Mail, Phone, MapPin, Clock } from 'lucide-react';

export default function ContactPage() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-stone-900 mb-4">Get in Touch</h1>
        <p className="text-stone-600 max-w-2xl mx-auto">
          Have a question about a product, delivery, or an existing order? Our friendly UK-based team is here to help.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        {/* Contact Information */}
        <div className="space-y-8">
          <h2 className="text-2xl font-bold text-stone-900">Contact Information</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100">
              <Phone className="w-8 h-8 text-amber-600 mb-4" />
              <h3 className="font-bold text-stone-900 mb-1">Call Us</h3>
              <p className="text-stone-600">0800 123 4567</p>
            </div>
            
            <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100">
              <Mail className="w-8 h-8 text-amber-600 mb-4" />
              <h3 className="font-bold text-stone-900 mb-1">Email Us</h3>
              <p className="text-stone-600">support@uksofashop.co.uk</p>
            </div>

            <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100">
              <MapPin className="w-8 h-8 text-amber-600 mb-4" />
              <h3 className="font-bold text-stone-900 mb-1">Head Office</h3>
              <p className="text-stone-600">123 Furniture Way<br/>London, SW1A 1AA<br/>UK</p>
            </div>

            <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100">
              <Clock className="w-8 h-8 text-amber-600 mb-4" />
              <h3 className="font-bold text-stone-900 mb-1">Opening Hours</h3>
              <p className="text-stone-600">Mon - Fri: 9am - 6pm<br/>Sat - Sun: 10am - 4pm</p>
            </div>
          </div>
        </div>

        {/* Contact Form UI */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-stone-200">
          <h2 className="text-2xl font-bold text-stone-900 mb-6">Send us a Message</h2>
          <form className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">First Name</label>
                <input type="text" className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-600 outline-none" placeholder="John" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Last Name</label>
                <input type="text" className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-600 outline-none" placeholder="Doe" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Email Address</label>
              <input type="email" className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-600 outline-none" placeholder="john@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Order Number (Optional)</label>
              <input type="text" className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-600 outline-none" placeholder="#12345" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Message</label>
              <textarea rows={4} className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-600 outline-none" placeholder="How can we help you?"></textarea>
            </div>
            <button type="button" className="w-full bg-stone-900 text-white py-3.5 rounded-xl font-bold hover:bg-stone-800 transition">
              Send Message
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}