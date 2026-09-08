import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.SITE_URL ?? 'http://localhost:3000';
  return [{ url: `${baseUrl}/login`, changeFrequency: 'yearly', priority: 0.1 }];
}
