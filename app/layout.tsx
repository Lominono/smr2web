import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f5f7' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};

export const metadata: Metadata = {
  title: 'SMR2',
  description: 'Horario lectivo y portal de clase de 2º SMR',
  manifest: '/manifest.json',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('smr2_theme');var d=document.documentElement;if(t==='dark'){d.classList.add('dark');d.classList.remove('light');}else if(t==='light'){d.classList.add('light');d.classList.remove('dark');}else{if(window.matchMedia('(prefers-color-scheme: dark)').matches){d.classList.add('dark');d.classList.remove('light');}else{d.classList.add('light');d.classList.remove('dark');}}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-[100dvh] flex flex-col bg-background text-foreground font-sans overscroll-none">
        {children}
      </body>
    </html>
  );
}
