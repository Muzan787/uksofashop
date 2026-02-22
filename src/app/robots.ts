import { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://uksofashop.co.uk'
  
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/', 
        '/checkout/', 
        '/track-order/', // No SEO value in tracking pages
        '/api/'          // Hide underlying API routes
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}