import { notFound } from 'next/navigation'
import Script from 'next/script'
import type { Metadata } from 'next'
import { getTenant } from '@/lib/api'
import type { TenantPublic } from '@/types/store'
import { StoreProviders } from '@/components/store/StoreProviders'
import { StorePaginaNoDisponible } from '@/components/store/StorePaginaNoDisponible'

const META_PIXEL_ID_RE = /^\d+$/
const GA_MEASUREMENT_ID_RE = /^G-[A-Z0-9]+$/i

type Props = {
  children: React.ReactNode
  params: Promise<{ tenant: string }>
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tenant: slug } = await params
  try {
    const tenant = await getTenant(slug)
    const description = tenant.branding.tagline ?? 'Pedidos online para tu local gastronómico'
    const ogImage = tenant.branding.bannerUrl ?? tenant.branding.logoUrl ?? undefined
    return {
      title: tenant.name,
      description,
      icons: tenant.branding.logoUrl ? { icon: tenant.branding.logoUrl } : undefined,
      openGraph: {
        title: tenant.name,
        description,
        type: 'website',
        ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 630, alt: tenant.name }] } : {}),
      },
    }
  } catch {
    return { title: 'MorfApp' }
  }
}

// Google Fonts preconnect
export default async function TenantLayout({ children, params }: Props) {
  const { tenant: slug } = await params

  let tenant: TenantPublic
  try {
    tenant = await getTenant(slug)
  } catch {
    return notFound()
  }

  if (tenant.status === 'Inactive') {
    return (
      <>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <StorePaginaNoDisponible tenantName={tenant.name} />
      </>
    )
  }

  const colorPrimary = tenant.branding?.colorPrimary ?? '#e8390e'
  const colorAccent = tenant.branding?.colorAccent ?? '#25d366'
  const hexToRgb = (hex: string) => {
    const c = (hex ?? '#000000').replace('#', '')
    return `${parseInt(c.slice(0, 2) || '0', 16)} ${parseInt(c.slice(2, 4) || '0', 16)} ${parseInt(c.slice(4, 6) || '0', 16)}`
  }

  const cssVars = [
    `--color-primary:${colorPrimary}`,
    `--color-accent:${colorAccent}`,
    `--color-primary-rgb:${hexToRgb(colorPrimary)}`,
    `--color-accent-rgb:${hexToRgb(colorAccent)}`,
  ].join(';')

  const metaPixelId = tenant.metaPixelId && META_PIXEL_ID_RE.test(tenant.metaPixelId) ? tenant.metaPixelId : null
  const gaId = tenant.googleAnalyticsId && GA_MEASUREMENT_ID_RE.test(tenant.googleAnalyticsId) ? tenant.googleAnalyticsId : null

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`:root{${cssVars}}`}</style>
      {metaPixelId && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${metaPixelId}');
            fbq('track', 'PageView');
          `}
        </Script>
      )}
      {gaId && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId}');
            `}
          </Script>
        </>
      )}
      <StoreProviders tenant={tenant}>{children}</StoreProviders>
    </>
  )
}
