import type { MetadataRoute } from 'next';
import { siteUrl } from './site-url';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = siteUrl();
  return [{ url: `${baseUrl}/login`, changeFrequency: 'yearly', priority: 0.1 }];
}
