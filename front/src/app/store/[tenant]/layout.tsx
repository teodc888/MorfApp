import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getTenant } from '@/lib/api'
import type { TenantPublic } from '@/types/store'
import { StoreProviders } from '@/components/store/StoreProviders'
import { StorePaginaNoDisponible } from '@/components/store/StorePaginaNoDisponible'

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

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`:root{${cssVars}}`}</style>
      <StoreProviders tenant={tenant}>{children}</StoreProviders>
    </>
  )
}
