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
  themeColor: '#0C0C0E',
};

export const metadata: Metadata = {
  title: 'Juan Fernando Ospina Tigreros — Portfolio Profesional',
  description:
    'Portafolio digital de Juan Fernando Ospina Tigreros. Estudiante de Sistemas Microinformáticos y Redes (SMR) en Santander, España. Proyectos personales, redes, sistemas y desarrollo web.',
  keywords: [
    'Juan Fernando Ospina Tigreros',
    'Juan Fernando Ospina',
    'lominono',
    'SMR',
    'Sistemas Microinformáticos y Redes',
    'IES Augusto González de Linares',
    'Santander',
    'Cantabria',
    'Portfolio',
    'Portafolio',
    'Desarrollador Web',
    'Redes',
    'Linux',
    'Next.js',
  ],
  authors: [{ name: 'Juan Fernando Ospina Tigreros', url: 'https://github.com/lominono' }],
  creator: 'Juan Fernando Ospina Tigreros',
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    alternateLocale: ['en_US'],
    title: 'Juan Fernando Ospina Tigreros — Portfolio Profesional',
    description:
      'Estudiante de Sistemas Microinformáticos y Redes (SMR) en Santander. Redes, sistemas y desarrollo web autónomo.',
    siteName: 'Juan Fernando Ospina — Portfolio',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Juan Fernando Ospina Tigreros — Portfolio',
    description: 'Estudiante de SMR en Santander. Redes, sistemas y desarrollo web autónomo.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={inter.variable} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
