// next.config.ts
import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development", // Keep disabled in dev mode
});

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    loader: 'custom', // <-- Tell Next.js to use a custom loader
    loaderFile: './cloudinaryLoader.js', // <-- Path to your custom loader
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'ae01.alicdn.com', // Added this new domain!
      },
    ],
  },
};

export default withPWA(nextConfig);