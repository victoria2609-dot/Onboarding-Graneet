import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Graneet — Onboarding',
  description: 'Plateforme d\'onboarding e-learning pour les nouveaux collaborateurs Graneet',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
