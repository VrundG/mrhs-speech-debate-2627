import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'MRHS Speech & Debate Command Center',
    template: '%s · MRHS Speech & Debate',
  },
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
