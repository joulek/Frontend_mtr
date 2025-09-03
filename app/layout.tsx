import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MTR | Industry',
  description: 'Espace client – MTR',
  icons: {
    icon: 'public/favicon.ico',          // public/favicon.ico
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png' // optionnel si tu l’as
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
