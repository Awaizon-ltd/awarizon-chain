import type { MetadataRoute } from 'next'
import { SITE_URL } from '../constants'

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  return [
    {
      url: SITE_URL,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${SITE_URL}/docs`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/grant`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ]
}
