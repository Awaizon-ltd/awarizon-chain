import type { MetadataRoute } from 'next'
import { SITE_URL } from '../constants'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard',
          '/analytics',
          '/apps',
          '/campaigns',
          '/tokens',
          '/api',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
