const productionUrl = 'https://mrhs-speech-debate-2627.vrundgurjar.workers.dev';

export function siteUrl() {
  const configured = process.env.SITE_URL;
  if (configured) {
    try {
      const url = new URL(configured);
      const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
      if (url.protocol === 'https:' || (process.env.NODE_ENV !== 'production' && local)) return url.origin;
    } catch { /* Fall back to the known deployment address. */ }
  }
  return process.env.NODE_ENV === 'production' ? productionUrl : 'http://localhost:3000';
}
