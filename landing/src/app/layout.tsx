import type { Metadata } from 'next';
import { EB_Garamond, Manrope } from 'next/font/google';
import './globals.css';

const garamond = EB_Garamond({
  subsets: ['latin'],
  variable: '--font-headline',
  display: 'swap',
  style: ['normal', 'italic'],
  weight: ['400', '500', '600', '700', '800'],
});

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'MorfApp — Tu menú digital, listo en minutos',
  description:
    'Creá tu menú digital para delivery y takeaway en minutos. Pedidos por WhatsApp, sin comisiones. Ideal para restaurantes, hamburgueserías y locales gastronómicos en Argentina.',
  keywords:
    'menú digital, carta digital, pedidos por WhatsApp, delivery online, restaurante online, morfapp, Argentina',
  robots: 'index, follow',
  authors: [{ name: 'MorfApp' }],
  openGraph: {
    type: 'website',
    url: 'https://morfapp.app/',
    title: 'MorfApp — Tu menú digital, listo en minutos',
    description:
      'Creá tu menú digital para delivery y takeaway en minutos. Pedidos por WhatsApp, sin comisiones. Primer mes gratis.',
    siteName: 'MorfApp',
    locale: 'es_AR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MorfApp — Tu menú digital, listo en minutos',
    description: 'Menú digital para tu local gastronómico. Pedidos por WhatsApp, sin comisiones. Primer mes gratis.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${garamond.variable} ${manrope.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        <link
          rel="icon"
          type="image/svg+xml"
          href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%23c2652a'/%3E%3Ctext x='32' y='48' font-family='Georgia%2Cserif' font-size='42' font-weight='bold' font-style='italic' text-anchor='middle' fill='%23fbe8d8'%3EM%3C/text%3E%3C/svg%3E"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
