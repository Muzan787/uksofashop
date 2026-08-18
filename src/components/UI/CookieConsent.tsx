'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Check if the user has already answered
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      // Mount the component first
      setShowBanner(true);
      // Trigger the slide-in animation slightly after mounting
      setTimeout(() => setIsAnimating(true), 50);
    } else if (consent === 'granted') {
      window.dispatchEvent(new Event('cookies_accepted'));
    }
  }, []);

  const handleConsent = (status: 'granted' | 'denied') => {
    localStorage.setItem('cookie_consent', status);
    
    // Trigger the slide-out animation
    setIsAnimating(false);
    
    // Wait for the CSS animation to finish before removing from DOM
    setTimeout(() => {
      setShowBanner(false);
      if (status === 'granted') {
        window.dispatchEvent(new Event('cookies_accepted'));
      }
    }, 500); // 500ms matches our Tailwind duration
  };

  if (!showBanner) return null;

  return (
    <div 
      className={`fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 flex justify-center pointer-events-none transition-all duration-500 ease-out ${
        isAnimating ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0'
      }`}
    >
      {/* Floating Card Design matching your Toaster theme */}
      <div className="pointer-events-auto bg-[#1c1917] border border-[#b45309] rounded-2xl shadow-2xl p-6 max-w-3xl w-full flex flex-col md:flex-row gap-6 items-center">
        
        {/* Left Side: Icon & Text */}
        <div className="flex-1 flex gap-4 items-start">
          <div className="text-3xl shrink-0 mt-1">🛋️</div>
          <div>
            <h3 className="text-lg font-semibold text-white font-serif tracking-wide mb-1">
              Crafting your perfect space
            </h3>
            <p className="text-sm text-stone-300 leading-relaxed">
              Just like picking the right fabric, we use cookies to tailor your experience. 
              They help us personalize our furniture recommendations, analyze site traffic, and improve our ads. 
              Read our <Link href="/privacy" className="text-[#b45309] font-medium hover:text-orange-400 transition-colors underline underline-offset-2">Privacy Policy</Link> to learn more.
            </p>
          </div>
        </div>

        {/* Right Side: Buttons */}
        <div className="flex flex-row md:flex-col gap-3 shrink-0 w-full md:w-auto">
          <button
            onClick={() => handleConsent('granted')}
            className="flex-1 md:flex-none px-6 py-2.5 text-sm font-medium text-white transition-all bg-[#b45309] rounded-lg hover:bg-orange-700 hover:shadow-[0_0_15px_rgba(180,83,9,0.4)] focus:outline-none focus:ring-2 focus:ring-[#b45309] focus:ring-offset-2 focus:ring-offset-[#1c1917]"
          >
            Accept All
          </button>
          <button
            onClick={() => handleConsent('denied')}
            className="flex-1 md:flex-none px-6 py-2.5 text-sm font-medium text-stone-300 transition-colors bg-transparent border border-stone-600 rounded-lg hover:bg-stone-800 hover:text-white focus:outline-none"
          >
            Essential Only
          </button>
        </div>
        
      </div>
    </div>
  );
}