import type { Metadata } from 'next';
import './globals.css';
import { siteUrl } from './site-url';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: 'MRHS Speech & Debate Command Center',
    template: '%s · MRHS Speech & Debate',
  },
  icons: { icon: '/marvin-logo.jpeg', apple: '/marvin-logo.jpeg' },
  description: 'Private membership, tournament, and payment operations for Marvin Ridge High School Speech & Debate.',
  alternates: { canonical: '/' },
  robots: { index: false, follow: false },
  openGraph: {
    title: 'MRHS Speech & Debate Command Center',
    description: 'Membership, tournaments, and payments for the 2026–27 season.',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'MRHS Speech & Debate Command Center' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MRHS Speech & Debate Command Center',
    description: 'Membership, tournaments, and payments for the 2026–27 season.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
