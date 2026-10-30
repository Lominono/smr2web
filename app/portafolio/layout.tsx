import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './portfolio.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#F7F7F5',
};

export const metadata: Metadata = {
  title: 'Juan Fernando Ospina Tigreros — Portafolio',
  description:
    'Estudiante de Sistemas Microinformáticos y Redes en el IES Augusto González de Linares, Santander. Interesado en redes, administración de sistemas y desarrollo web.',
  keywords: [
    'Juan Fernando Ospina',
    'SMR',
    'Sistemas Microinformáticos y Redes',
    'Santander',
    'Cantabria',
    'portfolio',
    'portafolio',
    'informática',
    'redes',
    'GitHub',
  ],
  authors: [{ name: 'Juan Fernando Ospina Tigreros' }],
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    title: 'Juan Fernando Ospina Tigreros — Portafolio',
    description:
      'Estudiante de SMR en el IES Augusto González de Linares, Santander. Redes, sistemas y desarrollo web.',
    siteName: 'Juan Fernando Ospina — Portafolio',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Juan Fernando Ospina Tigreros — Portafolio',
    description: 'Estudiante de SMR. Redes, sistemas y desarrollo web.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PortafolioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
