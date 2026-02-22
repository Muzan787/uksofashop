// src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import Header from "@/components/Layout/Header"; 
import Footer from "@/components/Layout/Footer"; // <-- Add this import
import { Toaster } from "react-hot-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UK Sofa Shop | Premium Furniture",
  description: "Buy the best premium sofas in the UK. Cash on Delivery available.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white flex flex-col min-h-screen`}>
        <CartProvider>
          <Toaster 
            position="bottom-right" 
            toastOptions={{
              duration: 3000,
              style: {
                background: '#1c1917',
                color: '#fff',
                borderRadius: '12px',
              }
            }} 
          />
          <Header />
          <main className="flex-grow">
            {children}
          </main>
          <Footer /> {/* <-- Add Footer here */}
        </CartProvider>
      </body>
    </html>
  );
}