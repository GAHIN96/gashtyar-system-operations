import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-outfit',
});

export const metadata: Metadata = {
  title: 'Gashtyar IT Operations — Management Portal',
  description: 'Internal IT Operations & Systems Status Portal for Gashtyar Travel & Tourism leadership.',
  icons: {
    icon: '/images/gashtyar_logo.png',
    apple: '/images/gashtyar_logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`h-full bg-slate-50 antialiased ${outfit.variable}`}>
      <body className={`${outfit.className} min-h-full flex flex-col text-slate-900 bg-slate-50 selection:bg-blue-100 selection:text-blue-900`}>
        {children}
      </body>
    </html>
  );
}
