'use client'
// src/components/Admin/PWAPromptManager.tsx
import { useEffect } from 'react'

export default function PWAPromptManager() {
  useEffect(() => {
    // This intercepts the browser's default install prompt
    const preventAutoPrompt = (e: Event) => {
      e.preventDefault(); 
      // By preventing default, the annoying popup never shows up.
      // The user can now only install it manually via the browser menu!
    };

    window.addEventListener('beforeinstallprompt', preventAutoPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', preventAutoPrompt);
    };
  }, []);

  return null; // This component doesn't render anything visually
}